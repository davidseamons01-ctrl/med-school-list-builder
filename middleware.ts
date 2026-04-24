import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/signin",
  },
});

export const config = {
  matcher: ["/", "/onboarding/:path*", "/schools/:path*", "/compare/:path*", "/tracker/:path*", "/export/:path*", "/discover/:path*", "/api/cycle/:path*"],
};
