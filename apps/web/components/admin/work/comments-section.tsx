import {
  createCommentAction,
  deleteCommentAction,
} from "@/app/admin/actions/work";
import { Button } from "@/components/admin/ui/button";
import { Textarea } from "@/components/admin/ui/textarea";
import { formatDateTime, interactionTypeLabel } from "@/lib/admin/crm";

type CommentItem = {
  id: string;
  body: string;
  createdAt: Date;
  author: { id: string; name: string | null; email: string };
  interaction: { id: string; type: string; occurredAt: Date } | null;
};

type CommentsSectionProps = {
  companyId: string;
  currentUserId: string;
  currentUserRole: string;
  comments: CommentItem[];
};

function authorLabel(author: CommentItem["author"]) {
  return author.name?.trim() || author.email;
}

function authorInitials(author: CommentItem["author"]) {
  const label = authorLabel(author);
  const parts = label.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  }
  return label.slice(0, 2).toUpperCase();
}

export function CommentsSection({
  companyId,
  currentUserId,
  currentUserRole,
  comments,
}: CommentsSectionProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Team comments</h2>
        <p className="text-sm text-muted-foreground">
          Short notes for handoffs — context, gotchas, internal politics — visible to the whole team.
        </p>
      </div>

      <form
        action={createCommentAction.bind(null, companyId)}
        className="space-y-3 rounded-xl border bg-background p-4"
      >
        <Textarea
          name="body"
          placeholder="Note for the team. Markdown not required."
          rows={3}
          required
          maxLength={2000}
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm">
            Post comment
          </Button>
        </div>
      </form>

      {comments.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-background px-4 py-8 text-sm text-muted-foreground">
          No comments yet. Use this space to flag context for the next teammate working on this account.
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => {
            const canDelete =
              comment.author.id === currentUserId || currentUserRole === "admin";
            return (
              <article key={comment.id} className="rounded-xl border bg-background p-4">
                <header className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase">
                      {authorInitials(comment.author)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{authorLabel(comment.author)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(comment.createdAt)}
                        {comment.interaction
                          ? ` · re: ${interactionTypeLabel(comment.interaction.type)} on ${formatDateTime(comment.interaction.occurredAt)}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  {canDelete ? (
                    <form action={deleteCommentAction.bind(null, comment.id)}>
                      <Button
                        type="submit"
                        size="sm"
                        variant="ghost"
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Delete
                      </Button>
                    </form>
                  ) : null}
                </header>
                <p className="mt-3 whitespace-pre-wrap text-sm">{comment.body}</p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
