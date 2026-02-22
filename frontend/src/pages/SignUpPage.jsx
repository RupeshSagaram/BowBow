// SignUpPage.jsx — Uses Clerk's prebuilt <SignUp /> component.
//
// Clerk's <SignUp /> handles the full registration flow:
//   - Name, email, password fields
//   - Email verification code step
//   - Social signup (if enabled in Clerk dashboard)
//
// routing="path" + path="/sign-up" — same pattern as SignInPage, required for React Router.
// forceRedirectUrl="/dashboard" — where to send the user after completing signup.
// signInUrl="/sign-in" — the "Already have an account? Sign in" link points here.

import { SignUp } from '@clerk/clerk-react';

export default function SignUpPage() {
  return (
    <div className="min-h-[calc(100vh-128px)] flex items-center justify-center px-4 py-12">
      <SignUp
        routing="path"
        path="/sign-up"
        forceRedirectUrl="/dashboard"
        signInUrl="/sign-in"
      />
    </div>
  );
}
