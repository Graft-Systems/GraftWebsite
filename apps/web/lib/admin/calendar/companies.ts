import { crmFetch } from "@/lib/admin/api";

export async function listWorkspaceCompaniesForSelect(_workspaceId: string) {
  const [companiesRaw, contactsRaw] = await Promise.all([
    crmFetch("/companies/"),
    crmFetch("/contacts/"),
  ]);
  const companies = Array.isArray(companiesRaw) ? companiesRaw : companiesRaw?.results ?? [];
  const contacts = Array.isArray(contactsRaw) ? contactsRaw : contactsRaw?.results ?? [];

  const contactsByCompany = new Map<string, typeof contacts>();
  for (const contact of contacts) {
    const companyId = contact.company;
    if (!companyId) continue;
    const key = String(companyId);
    const bucket = contactsByCompany.get(key) ?? [];
    bucket.push(contact);
    contactsByCompany.set(key, bucket);
  }

  return companies.map((company: Record<string, unknown>) => {
    const id = String(company.id);
    const companyContacts = contactsByCompany.get(id) ?? [];
    return {
      id,
      name: String(company.name ?? ""),
      domain: (company.domain as string | null) ?? null,
      contacts: companyContacts.map((contact: Record<string, unknown>) => ({
        id: String(contact.id),
        name: String(contact.name ?? ""),
        email: (contact.email as string | null) ?? null,
        isPrimary: Boolean(contact.is_primary),
      })),
    };
  });
}
