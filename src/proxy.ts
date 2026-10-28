import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Verify authenticated session
  const { data, error } = await supabase.auth.getClaims();

  function redirectToLogin() {
    const redirectResponse = NextResponse.redirect(
      new URL("/admin-login", request.url)
    );

    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });

    return redirectResponse;
  }

  if (error || !data?.claims?.sub) {
    return redirectToLogin();
  }

  // Verify admin permission
  const { data: admin, error: roleError } = await supabase
    .from("admin_users")
    .select("role")
    .eq("user_id", data.claims.sub)
    .maybeSingle();

  if (
    roleError ||
    !admin ||
    !["owner", "manager"].includes(admin.role)
  ) {
    return redirectToLogin();
  }

  return response;
}

// Protect every admin page, including subpages
export const config = {
  matcher: ["/admin/:path*"],
};
