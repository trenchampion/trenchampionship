import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-16">
      <EmptyState
        title="Page not found"
        action={
          <>
            <Link href="/" className="btn btn-primary">
              Back to home
            </Link>
            <Link href="/how-it-works/" className="btn">
              How it works
            </Link>
          </>
        }
      >
        The address does not match any page of this site. Character and match pages use query parameters, for example <code>/character/?id=1</code> and <code>/arena/?match=1</code>.
      </EmptyState>
    </div>
  );
}
