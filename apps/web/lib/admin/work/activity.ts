import { crmFetch } from "@/lib/admin/api";

export async function touchCompany(companyId: string) {
  return crmFetch(`/companies/${companyId}/`, {
    method: "PATCH",
    body: JSON.stringify({}),
  });
}
