import { Result, exception2Result } from "@adviser/cement";
import { useSession } from "@clerk/clerk-react";
import { QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ReqCreateLedger,
  ReqCreateTenant,
  ReqDeleteInvite,
  ReqDeleteLedger,
  ReqDeleteTenant,
  ReqEnsureUser,
  ReqFindUser,
  ReqInviteUser,
  ReqListInvites,
  ReqListLedgersByUser,
  ReqListTenantsByUser,
  ReqRedeemInvite,
  ReqUpdateLedger,
  ReqUpdateTenant,
  ReqUpdateUserTenant,
  ResCreateLedger,
  ResCreateTenant,
  ResDeleteInvite,
  ResDeleteLedger,
  ResDeleteTenant,
  ResEnsureUser,
  ResFindUser,
  ResInviteUser,
  ResListInvites,
  ResListLedgersByUser,
  ResListTenantsByUser,
  ResRedeemInvite,
  ResUpdateLedger,
  ResUpdateTenant,
  ResUpdateUserTenant,
  UserTenant,
} from "../backend/api.ts";
import type { InviteTicket } from "../backend/invites.ts";
import type { AuthType } from "../backend/users.ts";
import { API_URL } from "./helpers.ts";

interface TypeString {
  type: string;
}

interface WithType<T extends TypeString> {
  type: T["type"];
}

export type WithoutTypeAndAuth<T> = Omit<T, "type" | "auth">;

const emptyListTenantsByUser: ResListTenantsByUser = {
  type: "resListTenantsByUser",
  userId: "unk",
  authUserId: "unk",
  tenants: [] as UserTenant[],
};

const emptyListInvites: ResListInvites = {
  type: "resListInvites",
  tickets: [],
};

export interface InviteItem {
  tenantId: string;
  invites: InviteTicket[];
}

function wrapResultToPromise<T>(pro: Promise<Result<T>>) {
  return async (): Promise<T> => {
    const res = await pro;
    if (res.isOk()) {
      return Promise.resolve(res.Ok());
    }
    return Promise.reject(res.Err());
  };
}

export class CloudContext {
  readonly api: CloudApi;

  constructor() {
    this.api = new CloudApi(this);
  }

  private _session?: ReturnType<typeof useSession>;
  private _queryClient?: QueryClient;

  getToken() {
    return this._session?.session?.getToken({ template: "with-email" });
  }

  sessionReady(condition: boolean) {
    return this._session?.isLoaded && this._session?.isSignedIn && condition;
  }

  activeApi(condition = true) {
    return this.sessionReady(this._ensureUser.data?.user.status === "active" && condition);
  }

  initContext() {
    console.log("initContext");

    this._session = useSession();

    this._ensureUser = useQuery({
      queryKey: ["ensureUser"],
      queryFn: wrapResultToPromise(this.api.ensureUser({})),
      enabled: this.sessionReady(true),
    });

    this._queryClient = useQueryClient();
  }

  _ensureUser!: ReturnType<typeof useQuery<ResEnsureUser, []>>;
  // _listTenantsByUser!: ReturnType<typeof useRequest<ResListTenantsByUser, []>>
  _tenantsForInvites = new Set<string>();
  getListInvitesByTenant(tenantId: string): ReturnType<typeof useQuery<ResListInvites>> {
    const listInvites = useQuery({
      queryKey: ["listInvitesTenants", this._ensureUser.data?.user.userId],
      queryFn: async () => {
        const res = await wrapResultToPromise(
          this.api.listInvites({
            tenantIds: Array.from(this._tenantsForInvites),
          }),
        )();
        console.log("listInvites-tenants", this._tenantsForInvites, res);
        return res;
      },
      enabled: this.activeApi(this._tenantsForInvites.size > 0),
    });
    if (!this._tenantsForInvites.has(tenantId)) {
      this._tenantsForInvites.add(tenantId);
      listInvites.refetch();
    }
    return listInvites;
  }

  _tenantIdForLedgers = new Set<string>();
  getListLedgersByUser(tenantId: string): ReturnType<typeof useQuery<ResListLedgersByUser>> {
    const listLedgers = useQuery({
      queryKey: ["listLedgersByUser", this._ensureUser.data?.user.userId],
      queryFn: wrapResultToPromise(this.api.listLedgersByUser({ tenantIds: Array.from(this._tenantIdForLedgers) })),
      enabled: this.activeApi(this._tenantsForInvites.size > 0),
    });
    if (!this._tenantIdForLedgers.has(tenantId)) {
      this._tenantIdForLedgers.add(tenantId);
      listLedgers.refetch();
    }
    return listLedgers;
  }

  getListTenantsByUser(): ReturnType<typeof useQuery<ResListTenantsByUser>> {
    return useQuery({
      queryKey: ["listTenandsByUser", this._ensureUser.data?.user.userId],
      queryFn: () => {
        console.log("useListTenantsByUser", this._ensureUser.data?.user.userId);
        return wrapResultToPromise(this.api.listTenantsByUser({}))();
      },
      enabled: this.activeApi(),
    });
  }

  // getListLedgersByTenant(tenantId: string): ReturnType<typeof useQuery<ResListLedgers>> {
  //   return useQuery({
  //     queryKey: ["listLedgersByTenant", tenantId, this._ensureUser.data?.user.userId],
  //     queryFn: wrapResultToPromise(this.api.listLedgersByUser({ tenantIds: [tenantId] })),
  //     enabled: this.activeApi(),
  //   });
  // }

  createLedgerMutation() {
    // const listLedgers = this.getListLedgersByUser()
    return useMutation({
      mutationFn: ({ name, tenantId }: { name: string; tenantId: string }) => {
        return wrapResultToPromise(
          this.api.createLedger({
            ledger: {
              name,
              tenantId,
            },
          }),
        )();
      },
      onSuccess: async (data, variables, context) => {
        this.getListLedgersByUser(variables.tenantId);
        // this._queryClient?.setQueryData(["listLedgersByTenant", variables.tenantId,  this._ensureUser.data?.user.userId], (old: ResListLedgersByUser) => {
        //   console.log("old", old);
        //   return {
        //     ...old,
        //     ledgers: [...old.ledgers, data.ledger],
        //   };
        // });
      },
    });
  }
}

class CloudApi {
  private readonly cloud: CloudContext;
  constructor(cloud: CloudContext) {
    this.cloud = cloud;
  }

  private async getAuth() {
    return exception2Result(() => {
      return this.cloud.getToken()?.then((token) => {
        if (!token) throw new Error("No token available");
        return {
          type: "clerk",
          token,
        } as AuthType;
      });
    });
  }

  private async request<T extends TypeString, S>(req: WithType<T>): Promise<Result<S>> {
    const rAuth = await this.getAuth();
    if (rAuth.isErr()) {
      return Result.Err(rAuth.Err());
    }
    const reqBody = JSON.stringify({
      ...req,
      auth: rAuth.Ok(),
    });
    // console.log(API_URL, reqBody);
    const res = await fetch(API_URL, {
      method: "POST",
      // headers: {
      // "Content-Type": "application/json",
      // "Accept": "application/json",
      // },
      body: reqBody,
    });
    if (res.ok) {
      const jso = await res.json();
      // console.log("jso", jso);
      return Result.Ok(jso);
    }
    const body = await res.text();
    return Result.Err(`HTTP: ${res.status} ${res.statusText}: ${body}`);
  }

  async ensureUser(req: WithoutTypeAndAuth<ReqEnsureUser>): Promise<Result<ResEnsureUser>> {
    return this.request<ReqEnsureUser, ResEnsureUser>({ ...req, type: "reqEnsureUser" });
  }
  findUser(req: WithoutTypeAndAuth<ReqFindUser>): Promise<Result<ResFindUser>> {
    return this.request<ReqFindUser, ResFindUser>({ ...req, type: "reqFindUser" });
  }
  createTenant(req: WithoutTypeAndAuth<ReqCreateTenant>): Promise<Result<ResCreateTenant>> {
    return this.request<ReqCreateTenant, ResCreateTenant>({ ...req, type: "reqCreateTenant" });
  }
  updateTenant(req: WithoutTypeAndAuth<ReqUpdateTenant>): Promise<Result<ResUpdateTenant>> {
    return this.request<ReqUpdateTenant, ResUpdateTenant>({ ...req, type: "reqUpdateTenant" });
  }
  deleteTenant(req: WithoutTypeAndAuth<ReqDeleteTenant>): Promise<Result<ResDeleteTenant>> {
    return this.request<ReqDeleteTenant, ResDeleteTenant>({ ...req, type: "reqDeleteTenant" });
  }
  connectUserToTenant(req: WithoutTypeAndAuth<ReqRedeemInvite>): Promise<Result<ResRedeemInvite>> {
    return this.request<ReqRedeemInvite, ResRedeemInvite>({ ...req, type: "reqRedeemInvite" });
  }
  listTenantsByUser(req: WithoutTypeAndAuth<ReqListTenantsByUser>): Promise<Result<ResListTenantsByUser>> {
    return this.request<ReqListTenantsByUser, ResListTenantsByUser>({ ...req, type: "reqListTenantsByUser" });
  }
  inviteUser(req: WithoutTypeAndAuth<ReqInviteUser>): Promise<Result<ResInviteUser>> {
    return this.request<ReqInviteUser, ResInviteUser>({ ...req, type: "reqInviteUser" });
  }
  listInvites(req: WithoutTypeAndAuth<ReqListInvites>): Promise<Result<ResListInvites>> {
    return this.request<ReqListInvites, ResListInvites>({ ...req, type: "reqListInvites" });
  }
  deleteInvite(req: WithoutTypeAndAuth<ReqDeleteInvite>): Promise<Result<ResDeleteInvite>> {
    return this.request<ReqDeleteInvite, ResDeleteInvite>({ ...req, type: "reqDeleteInvite" });
  }
  updateUserTenant(req: WithoutTypeAndAuth<ReqUpdateUserTenant>): Promise<Result<ResUpdateUserTenant>> {
    return this.request<ReqUpdateUserTenant, ResUpdateUserTenant>({ ...req, type: "reqUpdateUserTenant" });
  }
  createLedger(req: WithoutTypeAndAuth<ReqCreateLedger>): Promise<Result<ResCreateLedger>> {
    return this.request<ReqCreateLedger, ResCreateLedger>({ ...req, type: "reqCreateLedger" });
  }
  updateLedger(req: WithoutTypeAndAuth<ReqUpdateLedger>): Promise<Result<ResUpdateLedger>> {
    return this.request<ReqUpdateLedger, ResUpdateLedger>({ ...req, type: "reqUpdateLedger" });
  }
  deleteLedger(req: WithoutTypeAndAuth<ReqDeleteLedger>): Promise<Result<ResDeleteLedger>> {
    return this.request<ReqDeleteLedger, ResDeleteLedger>({ ...req, type: "reqDeleteLedger" });
  }
  listLedgersByUser(req: WithoutTypeAndAuth<ReqListLedgersByUser>): Promise<Result<ResListLedgersByUser>> {
    return this.request<ReqListLedgersByUser, ResListLedgersByUser>({ ...req, type: "reqListLedgersByUser" });
  }
}
