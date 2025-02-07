/* eslint-disable @typescript-eslint/no-explicit-any */
import { useNavigate } from "react-router-dom";

interface TableRow {
  _id: string;
  [key: string]: unknown;
}

interface TableProps {
  hrefFn?: (id: string) => string;
  dbName?: string;
  headers: string[];
  rows: TableRow[];
  th?: string;
  link?: string[];
  onDelete?: (id: string) => Promise<void>;
}

export default function DynamicTable({ hrefFn, dbName, headers, rows, th = "_id", link = ["_id"] }: TableProps) {
  const navigate = useNavigate();

  function handleRowClick(fields: TableRow) {
    if (hrefFn) {
      navigate(hrefFn(fields._id));
    } else if (dbName) {
      navigate(`/fp/databases/${dbName}/docs/${fields._id}`);
    }
  }

  return (
    <div className="relative mt-[40px] overflow-x-scroll">
      <table className="w-full text-left text-fp-p border-collapse">
        <thead className="relative z-10">
          <tr key={`header-${headers.join("-")}`}>
            {headers.map((header: string) => (
              <th key={header} scope="col" className="px-[15px] py-[8px] text-11 text-fp-dec-02">
                {header === "_id" ? "document id" : header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-fp-bg-00 border border-fp-dec-00 text-14">
          {rows.map((fields) => (
            <tr 
              key={fields._id} 
              onClick={() => handleRowClick(fields)}
              className="hover:bg-fp-bg-02 border-b border-fp-dec-00 cursor-pointer"
            >
              {headers.map((header: string) => (
                <td key={header} className={`px-[15px] py-[12px] ${header === th ? "font-semibold whitespace-nowrap" : ""}`}>
                  {formatTableCellContent(fields[header])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatTableCellContent(obj: unknown): string {
  if (typeof obj === "string") return obj;
  return JSON.stringify(obj);
}
