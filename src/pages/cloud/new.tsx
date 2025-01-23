import { useForm } from "react-hook-form";
import { Form, redirect, SubmitTarget, useNavigate, useSubmit } from "react-router-dom";
import { AppContext, AppContextType } from "../../app-context.tsx";
import { useContext } from "react";

export function newCloudAction(ctx: AppContextType) {
  return async ({ request }: { request: Request }) => {
    const tenantName = (await request.json()).tenantName;
    const rTenant = await ctx.cloud.api.createTenant({
      tenant: {
        name: tenantName,
      },
    });
    console.log("created", rTenant);
    if (rTenant.isErr()) {
      return new Response(rTenant.Err().message, { status: 400 });
    }
    // const { refresh } = ctx.cloud.useListTenantsByUser();
    // refresh();
    return redirect(`/fp/cloud/${rTenant.Ok().tenant.tenantId}`);
  };
}

export function CloudNew() {
  // const submit = useSubmit();
  const { register, handleSubmit } = useForm();

  const ctx = useContext(AppContext);
  const { refresh } = ctx.cloud.useListTenantsByUser();

  // const navigate = useNavigate();
  const submit = useSubmit();

  async function onSubmit(data: SubmitTarget) {
    // const my = data as { tenantName: string };
    // const rTenant = await ctx.cloud.api.createTenant({
    //   tenant: {
    //     name: my.tenantName,
    //   },
    // });
    // refresh();
    // await navigate(`/fp/cloud/${rTenant.Ok().tenant.tenantId}`);
    // console.log("created", rTenant);
    // return redirect(`/fp/cloud/${rTenant.Ok().tenant.tenantId}`);
    submit(data, {
      method: "post",
      action: ".",
      encType: "application/json",
    });
  }

  return (
    <div className="bg-[--muted] shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-base font-semibold leading-6 text-[--foreground]">New Tenant Name:</h3>

        <Form onSubmit={handleSubmit(onSubmit)} className="mt-5 sm:flex sm:items-center">
          <div className="w-full sm:max-w-xs">
            <label htmlFor="tenantName" className="sr-only">
              Tenant Name
            </label>
            <input
              id="tenantName"
              {...register("tenantName", { required: true })}
              type="text"
              placeholder="New Tenant name"
              autoFocus
              className="w-full py-2 px-3 bg-[--background] border border-[--border] rounded text-sm font-medium text-[--foreground] placeholder-[--muted-foreground] focus:outline-none focus:ring-1 focus:ring-[--ring] focus:border-transparent transition duration-200 ease-in-out"
            />
          </div>
          <button
            type="submit"
            className="mt-3 inline-flex w-full items-center justify-center rounded bg-[--accent] px-3 py-2 text-sm font-semibold text-accent-foreground shadow-sm hover:bg-[--accent]/80 transition-colors sm:ml-3 sm:mt-0 sm:w-auto"
          >
            Create
          </button>
        </Form>
      </div>
    </div>
  );
}
