"use client";

import Dashboard from "@/components/Dashboard";
import { ToastProvider } from "@/hooks/useToast";
import ToastContainer from "@/components/ToastContainer";

export default function Home() {
  return (
    <ToastProvider>
      <Dashboard />
      <ToastContainer />
    </ToastProvider>
  );
}

function ResourceCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <div className="flex flex-col gap-2 bg-slate-200 dark:bg-slate-800 p-4 rounded-md h-28 overflow-auto">
      <a href={href} className="text-sm underline hover:no-underline">
        {title}
      </a>
      <p className="text-xs">{description}</p>
    </div>
  );
}
