"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Enquiry = {
  id: number;
  guest_name: string;
  message: string;
  phone: string;
  status: string;
  created_at: string;
};

const validStatuses = ["New", "Contacted", "Closed"] as const;
type EnquiryStatus = (typeof validStatuses)[number];

export default function Home() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [guestName, setGuestName] = useState("");
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        router.replace("/login");
        return;
      }

      setCheckingAuth(false);
    }

    void checkAuth();
  }, [router]);

  const loadEnquiries = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("enquiries")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setEnquiries(data ?? []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (checkingAuth) return;
    void loadEnquiries();
  }, [checkingAuth, loadEnquiries]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  async function addEnquiry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const { error } = await supabase.from("enquiries").insert({
      guest_name: guestName.trim(),
      message: message.trim(),
      phone: phone.trim(),
      status: "New",
    });

    if (error) {
      setError(error.message);
    } else {
      setGuestName("");
      setMessage("");
      setPhone("");
      await loadEnquiries();
    }

    setSubmitting(false);
  }

  async function changeStatus(id: number, status: EnquiryStatus) {
    setError(null);

    const { error } = await supabase
      .from("enquiries")
      .update({ status })
      .eq("id", id);

    if (error) {
      setError(error.message);
      return;
    }

    setEnquiries((items) =>
      items.map((item) => (item.id === id ? { ...item, status } : item))
    );
  }

  const newCount = enquiries.filter((item) => item.status === "New").length;

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-slate-600">Checking login...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-900 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-emerald-700">
              StaySathi
            </h1>
            <p className="mt-1 text-slate-600">
              Your hotel enquiry dashboard
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadEnquiries()}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700"
            >
              Refresh
            </button>

            <button
              type="button"
              onClick={() => void handleLogout()}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </header>

        {error && (
          <p className="mb-4 rounded-lg bg-red-100 p-4 text-red-800">
            {error}
          </p>
        )}

        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          {[
            { title: "Total enquiries", value: enquiries.length },
            { title: "New enquiries", value: newCount },
            { title: "Database", value: "Supabase connected" },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <p className="text-sm text-slate-500">{card.title}</p>
              <p className="mt-2 text-2xl font-semibold">{card.value}</p>
            </div>
          ))}
        </section>

        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Add enquiry</h2>

          <form onSubmit={addEnquiry}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Guest name
                <input
                  required
                  maxLength={100}
                  value={guestName}
                  onChange={(event) => setGuestName(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-300 p-3"
                />
              </label>

              <label className="block text-sm font-medium">
                Message
                <input
                  required
                  maxLength={500}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-300 p-3"
                />
              </label>
              <label className="block text-sm font-medium">
  Phone / WhatsApp number
  <input
    required
    maxLength={20}
    value={phone}
    onChange={(event) => setPhone(event.target.value)}
    className="mt-2 w-full rounded-lg border border-slate-300 p-3"
  />
</label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-4 rounded-lg bg-emerald-700 px-5 py-3 font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Save enquiry"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold">Guest enquiries</h2>

          {loading ? (
            <p className="text-slate-600">Loading enquiries...</p>
          ) : enquiries.length === 0 ? (
            <p className="text-slate-600">
              No enquiries yet. Add your first enquiry above.
            </p>
          ) : (
            <div className="space-y-4">
              {enquiries.map((item) => (
                <article
                  key={item.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <h3 className="font-semibold">{item.guest_name}</h3>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs">
                      {item.status}
                    </span>
                  </div>

                  <p className="mt-2 text-slate-600">{item.message}</p>
                  {item.phone && (
  <a
    href={`https://wa.me/${item.phone.replace(/\D/g, "")}`}
    target="_blank"
    rel="noreferrer"
    className="mt-2 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700"
  >
    WhatsApp {item.phone}
  </a>
)}

                  <label className="mt-4 block text-sm">
                    Status
                    <select
                      value={item.status}
                      onChange={(event) =>
                        void changeStatus(
                          item.id,
                          event.target.value as EnquiryStatus
                        )
                      }
                      className="ml-3 rounded-lg border border-slate-300 bg-white p-2"
                    >
                      {validStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                </article>
              ))}
            </div>
          )}
        </section>

        <p className="mt-6 text-center text-sm text-slate-500">
          Enquiries are saved in your Supabase database. WhatsApp messaging is
          not connected yet.
        </p>
      </div>
    </main>
  );
}