import { authMiddleware } from "@civic/auth-web3/nextjs/middleware";

export default authMiddleware();

export const config = {
  // The matcher is a regular expression that specifies which paths the middleware should run on.
  // By using a negative lookahead `(?!...)`, we are telling the middleware to run on ALL paths
  // EXCEPT for the ones that match the patterns inside the lookahead.
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - admin (Admin routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - sitemap.xml
     * - robots.txt
     * - any file with an extension (e.g., .svg, .png, .jpg, .gif)
     * - the login page itself
     */
    '/((?!api|admin|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|login|.*\\.).*)',
  ],
};
