// SignInPage.jsx — Uses Clerk's prebuilt <SignIn /> component.
//
// Clerk's <SignIn /> handles everything automatically:
//   - Email + password form
//   - "Forgot password" flow with email reset
//   - Social login buttons (if enabled in Clerk dashboard)
//   - Email verification steps
//
// routing="path" tells Clerk to use React Router for navigation
// (not Clerk's own built-in router). This is required when using React Router.
//
// path="/sign-in" tells Clerk where this component is mounted —
// it uses this to build sub-routes like /sign-in/factor-one.
//
// forceRedirectUrl="/dashboard" — where to redirect after a successful sign-in.
// signUpUrl="/sign-up" — the link "Don't have an account? Sign up" points here.

import { SignIn } from '@clerk/clerk-react';

export default function SignInPage() {
  return (
    <div className="min-h-[calc(100vh-128px)] flex items-center justify-center px-4 py-12">
      <SignIn
        routing="path"
        path="/sign-in"
        forceRedirectUrl="/dashboard"
        signUpUrl="/sign-up"
      />
    </div>
  );
}
