import { useListSubjects, getListSubjectsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/theme-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Bell, Palette, BookOpen, Calendar as CalendarIcon, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { data: subjects } = useListSubjects({ query: { queryKey: getListSubjectsQueryKey() } });

  return (
    <div className="space-y-8 pb-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your account, preferences, and workspace.</p>
      </div>

      <Tabs defaultValue="account" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="notifications">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-xl flex items-center gap-2"><User className="h-5 w-5" /> Profile Settings</CardTitle>
              <CardDescription>Update your personal information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" defaultValue="Alex Student" className="max-w-md" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" defaultValue="alex@example.com" className="max-w-md" />
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subjects" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-xl flex items-center gap-2"><BookOpen className="h-5 w-5" /> Active Subjects</CardTitle>
              <CardDescription>The subjects currently on your dashboard.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                {subjects?.map(subject => (
                  <div key={subject.id} className="flex justify-between items-center p-3 border rounded-md bg-card">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: subject.color }} />
                      <div>
                        <p className="font-medium text-sm">{subject.name}</p>
                        <p className="text-xs text-muted-foreground">{subject.code}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive/90 hover:bg-destructive/10">Remove</Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full sm:w-auto">Add Another Subject</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-xl flex items-center gap-2"><Palette className="h-5 w-5" /> Theme</CardTitle>
              <CardDescription>Select your preferred visual style.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4 max-w-2xl">
              <button 
                onClick={() => setTheme("light")}
                className={`relative flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all ${theme === 'light' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
              >
                <div className="w-full h-20 bg-white border rounded-md shadow-sm mb-3 flex flex-col gap-2 p-2">
                  <div className="w-1/2 h-2 bg-slate-200 rounded" />
                  <div className="w-full h-10 bg-slate-50 rounded border" />
                </div>
                <span className="font-medium text-sm">Light Theme</span>
                {theme === 'light' && <Check className="absolute top-2 right-2 h-4 w-4 text-primary" />}
              </button>

              <button 
                onClick={() => setTheme("dark")}
                className={`relative flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all ${theme === 'dark' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
              >
                <div className="w-full h-20 bg-slate-950 border border-slate-800 rounded-md shadow-sm mb-3 flex flex-col gap-2 p-2">
                  <div className="w-1/2 h-2 bg-slate-800 rounded" />
                  <div className="w-full h-10 bg-slate-900 rounded border border-slate-800" />
                </div>
                <span className="font-medium text-sm">Dark Theme</span>
                {theme === 'dark' && <Check className="absolute top-2 right-2 h-4 w-4 text-primary" />}
              </button>

              <button 
                onClick={() => setTheme("system")}
                className={`relative flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all ${theme === 'system' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
              >
                <div className="w-full h-20 flex border rounded-md shadow-sm mb-3 overflow-hidden">
                  <div className="w-1/2 h-full bg-white p-2">
                    <div className="w-3/4 h-2 bg-slate-200 rounded" />
                  </div>
                  <div className="w-1/2 h-full bg-slate-950 p-2 border-l border-slate-800">
                    <div className="w-3/4 h-2 bg-slate-800 rounded" />
                  </div>
                </div>
                <span className="font-medium text-sm">System</span>
                {theme === 'system' && <Check className="absolute top-2 right-2 h-4 w-4 text-primary" />}
              </button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-xl flex items-center gap-2"><Bell className="h-5 w-5" /> Preferences</CardTitle>
              <CardDescription>Control when and how Scholr contacts you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Morning Summary</Label>
                  <p className="text-sm text-muted-foreground">Receive a daily email with your tasks for the day.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Deadline Reminders</Label>
                  <p className="text-sm text-muted-foreground">Get notified 24 hours before a task is due.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Exam Approaching Alerts</Label>
                  <p className="text-sm text-muted-foreground">Weekly count-down emails when exams are within 30 days.</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-xl flex items-center gap-2"><CalendarIcon className="h-5 w-5" /> Integrations</CardTitle>
              <CardDescription>Connect Scholr with your other tools.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white border shadow-sm rounded flex items-center justify-center">
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.2 14.2L11 13V7h1.5v5.2l4.5 2.7-.8 1.3z" fill="#4285F4"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium">Google Calendar</h4>
                    <p className="text-sm text-muted-foreground">Sync your tasks and deadlines</p>
                  </div>
                </div>
                <Button variant="outline">Connect</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
