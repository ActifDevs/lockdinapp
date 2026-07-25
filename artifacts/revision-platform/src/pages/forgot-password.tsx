import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Link href="/" className="absolute top-8 left-8 font-serif text-2xl font-bold tracking-tight">
        Scholr
      </Link>
      
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-3 pt-8 text-center">
          <CardTitle className="font-serif text-3xl">Reset password</CardTitle>
          <CardDescription className="text-base">
            {isSubmitted 
              ? "Check your email for a reset link" 
              : "Enter your email and we'll send you a reset link"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSubmitted ? (
            <div className="text-center space-y-6 py-4">
              <div className="mx-auto w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground">
                We've sent an email to your address with instructions to reset your password.
              </p>
              <Button variant="outline" className="w-full h-11" onClick={() => setIsSubmitted(false)}>
                Try another email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="m@example.com" required className="h-11" />
              </div>
              <Button type="submit" className="w-full h-11 text-base mt-2">
                Send reset link
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center pb-8 pt-4">
          <Link href="/login" className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
