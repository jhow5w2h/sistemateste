<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Stock, payment confirmation, cancel, revert and check-in run in security-definer SQL functions — keeps stock atomic and lets a future C6 webhook reuse `mark_order_paid` logic.
- Roles live only in `user_roles`, checked with `has_role`; first signed-up user becomes admin, others granted via `grant_admin` — prevents privilege escalation.
- Storage buckets are private (workspace blocks public); posters use long-lived signed URLs stored on the event.
- Staff roles (admin, moderator, promoter) live in user_roles; moderator/promoter access goes through security-definer RPCs (guest_list, check_in_ticket, promoter_stats) — avoids widening table RLS. Promoter attribution uses a ?ref code saved in localStorage and attached after create_order.
