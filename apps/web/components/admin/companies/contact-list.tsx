import { Badge } from "@/components/admin/ui/badge";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
import { Textarea } from "@/components/admin/ui/textarea";

type ContactListProps = {
  companyId: string;
  contacts: Array<{
    id: string;
    name: string;
    email: string | null;
    title: string | null;
    contactRole: string | null;
    isPrimary: boolean;
    notes: string | null;
  }>;
  createContactAction: (companyId: string, formData: FormData) => Promise<void>;
  updateContactAction: (contactId: string, formData: FormData) => Promise<void>;
  deleteContactAction: (contactId: string, formData: FormData) => Promise<void>;
};

export function ContactList({
  companyId,
  contacts,
  createContactAction,
  updateContactAction,
  deleteContactAction,
}: ContactListProps) {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Contacts</h2>
          <p className="text-sm text-muted-foreground">
            People at this organization. Mark one primary point of contact.
          </p>
        </div>
        <div className="space-y-4">
          {contacts.length === 0 ? (
            <div className="rounded-lg border border-dashed px-4 py-8 text-sm text-muted-foreground">
              No contacts yet.
            </div>
          ) : (
            contacts.map((contact) => (
              <form
                key={contact.id}
                action={updateContactAction.bind(null, contact.id)}
                className="space-y-4 rounded-xl border bg-background p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{contact.name}</p>
                    {contact.isPrimary ? <Badge>Primary</Badge> : null}
                  </div>
                  <Button
                    formAction={deleteContactAction.bind(null, contact.id)}
                    type="submit"
                    variant="outline"
                    size="sm"
                  >
                    Remove
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`name-${contact.id}`}>Name</Label>
                    <Input
                      id={`name-${contact.id}`}
                      name="name"
                      defaultValue={contact.name}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`email-${contact.id}`}>Email</Label>
                    <Input
                      id={`email-${contact.id}`}
                      name="email"
                      type="email"
                      defaultValue={contact.email ?? ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`title-${contact.id}`}>Title</Label>
                    <Input
                      id={`title-${contact.id}`}
                      name="title"
                      defaultValue={contact.title ?? ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`contactRole-${contact.id}`}>Role</Label>
                    <Input
                      id={`contactRole-${contact.id}`}
                      name="contactRole"
                      defaultValue={contact.contactRole ?? ""}
                      placeholder="champion, technical, buyer"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor={`notes-${contact.id}`}>Notes</Label>
                    <Textarea
                      id={`notes-${contact.id}`}
                      name="notes"
                      defaultValue={contact.notes ?? ""}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm md:col-span-2">
                    <input
                      type="checkbox"
                      name="isPrimary"
                      defaultChecked={contact.isPrimary}
                      className="size-4 rounded border"
                    />
                    Primary contact
                  </label>
                </div>
                <Button type="submit" size="sm">
                  Save contact
                </Button>
              </form>
            ))
          )}
        </div>
      </section>

      <section className="space-y-4 rounded-xl border bg-background p-4">
        <div>
          <h3 className="font-medium">Add contact</h3>
          <p className="text-sm text-muted-foreground">
            Create another person under this company.
          </p>
        </div>
        <form action={createContactAction.bind(null, companyId)} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="new-contact-name">Name</Label>
            <Input id="new-contact-name" name="name" required placeholder="Sarah Chen" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-contact-email">Email</Label>
            <Input id="new-contact-email" name="email" type="email" placeholder="sarah@acme.example" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-contact-title">Title</Label>
            <Input id="new-contact-title" name="title" placeholder="VP Operations" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-contact-role">Role</Label>
            <Input id="new-contact-role" name="contactRole" placeholder="champion" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="new-contact-notes">Notes</Label>
            <Textarea id="new-contact-notes" name="notes" />
          </div>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" name="isPrimary" className="size-4 rounded border" />
            Primary contact
          </label>
          <div className="md:col-span-2">
            <Button type="submit">Add contact</Button>
          </div>
        </form>
      </section>
    </div>
  );
}
