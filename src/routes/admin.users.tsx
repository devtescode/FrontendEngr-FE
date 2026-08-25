import { createFileRoute } from "@tanstack/react-router";
import {
  Search,
  Users,
  Mail,
  Phone,
  GraduationCap,
  User,
  X,
  Eye,
  CalendarDays,
  Hash,
  RefreshCw,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [{ title: "Students — Admin" }],
  }),
  component: AdminUsers,
});

const BASE_URL = "http://localhost:4500";

type UserType = {
  _id: string;
  fullName: string;
  email: string;
  matric: string;
  phoneNumber?: string;
  level?: string | number;
  gender?: string;
  createdAt?: string;
};

function AdminUsers() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [selectedUser, setSelectedUser] =
    useState<UserType | null>(null);

  /*
   * =====================================================
   * FETCH USERS
   * =====================================================
   */

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const token =
        sessionStorage.getItem(
          "pulselab_token"
        );

      const response = await fetch(
        `${BASE_URL}/admin/getallusers`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to load users"
        );
      }

      setUsers(data.users || []);
    } catch (error: any) {
      console.error(
        "Failed to load users:",
        error
      );

      setError(
        error.message ||
          "Failed to load users"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  /*
   * =====================================================
   * SEARCH
   * =====================================================
   */

  const filteredUsers = useMemo(() => {
    const value =
      search.trim().toLowerCase();

    if (!value) return users;

    return users.filter((user) => {
      return (
        user.fullName
          ?.toLowerCase()
          .includes(value) ||
        user.matric
          ?.toLowerCase()
          .includes(value) ||
        user.email
          ?.toLowerCase()
          .includes(value) ||
        user.phoneNumber
          ?.toLowerCase()
          .includes(value)
      );
    });
  }, [users, search]);

  /*
   * =====================================================
   * STATISTICS
   * =====================================================
   */

  const totalUsers = users.length;

  const maleUsers = users.filter(
    (user) =>
      user.gender?.toLowerCase() ===
      "male"
  ).length;

  const femaleUsers = users.filter(
    (user) =>
      user.gender?.toLowerCase() ===
      "female"
  ).length;

  /*
   * =====================================================
   * LOADING
   * =====================================================
   */

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 p-5 text-white md:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="animate-pulse space-y-6">

            <div className="h-10 w-72 rounded-xl bg-white/5" />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-28 rounded-2xl bg-white/5"
                />
              ))}
            </div>

            <div className="h-14 rounded-2xl bg-white/5" />

            <div className="h-96 rounded-3xl bg-white/5" />

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-5 text-white md:p-8">

      <div className="mx-auto max-w-7xl">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

          <div>

            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-brand-accent">
              <Users className="h-4 w-4" />
              Student Management
            </div>

            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Registered Students
            </h1>

            <p className="mt-2 max-w-xl text-sm text-slate-500">
              View and manage students who
              have registered on PulseLab.
            </p>

          </div>

          <button
            onClick={loadUsers}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>

        </div>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="mb-6 flex items-center justify-between rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-red-400">

            <span>{error}</span>

            <button
              onClick={() =>
                setError("")
              }
              className="rounded-lg p-1 hover:bg-red-500/10"
            >
              <X className="h-4 w-4" />
            </button>

          </div>
        )}

        {/* =================================================
            STATISTICS
        ================================================= */}

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

          <StatCard
            icon={<Users className="h-5 w-5" />}
            label="Total Students"
            value={totalUsers}
          />

          <StatCard
            icon={<User className="h-5 w-5" />}
            label="Male Students"
            value={maleUsers}
          />

          <StatCard
            icon={<User className="h-5 w-5" />}
            label="Female Students"
            value={femaleUsers}
          />

        </div>

        {/* =================================================
            SEARCH
        ================================================= */}

        <div className="mb-6 rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-xl">

          <div className="relative">

            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

            <input
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Search by name, matric number, email or phone..."
              className="h-12 w-full rounded-xl border border-white/10 bg-slate-950 pl-12 pr-12 text-sm text-white outline-none placeholder:text-slate-600 transition focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/10"
            />

            {search && (
              <button
                onClick={() =>
                  setSearch("")
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}

          </div>

        </div>

        {/* =================================================
            RESULT
        ================================================= */}

        <div className="mb-4 flex items-center justify-between">

          <p className="text-sm text-slate-500">
            Showing{" "}
            <span className="font-semibold text-slate-300">
              {filteredUsers.length}
            </span>{" "}
            student
            {filteredUsers.length !== 1 &&
              "s"}
          </p>

        </div>

        {/* =================================================
            EMPTY
        ================================================= */}

        {filteredUsers.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 px-6 py-20 text-center">

            <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-white/5">
              <Users className="h-8 w-8 text-slate-600" />
            </div>

            <h2 className="text-lg font-semibold text-white">
              {search
                ? "No students found"
                : "No registered students"}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              {search
                ? "Try searching with another name, matric number or email."
                : "Registered students will appear here."}
            </p>

          </div>
        ) : (

          /* =================================================
             USER LIST
          ================================================= */

          <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 shadow-xl">

            {/* TABLE HEADER */}

            <div className="hidden grid-cols-[minmax(0,1fr)_180px_180px_100px] gap-4 border-b border-white/10 bg-white/[0.02] px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-600 md:grid">

              <span>Student</span>
              <span>Matric Number</span>
              <span>Email</span>
              <span className="text-right">
                Action
              </span>

            </div>

            {/* USERS */}

            <div className="divide-y divide-white/5">

              {filteredUsers.map(
                (user) => {

                  const initials =
                    user.fullName
                      ?.split(" ")
                      .map(
                        (name) =>
                          name[0]
                      )
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();

                  return (
                    <div
                      key={user._id}
                      className="group grid gap-4 px-5 py-5 transition hover:bg-white/[0.02] md:grid-cols-[minmax(0,1fr)_180px_180px_100px] md:items-center md:px-6"
                    >

                      {/* STUDENT */}

                      <div className="flex items-center gap-4">

                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-accent/10 font-bold text-brand-accent">
                          {initials || "U"}
                        </div>

                        <div className="min-w-0">

                          <p className="truncate font-semibold text-white">
                            {user.fullName}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {user.level
                              ? `Level ${user.level}`
                              : "Student"}
                          </p>

                        </div>

                      </div>

                      {/* MATRIC */}

                      <div>

                        <p className="text-[10px] uppercase tracking-wider text-slate-600 md:hidden">
                          Matric Number
                        </p>

                        <p className="mt-1 font-mono text-sm font-semibold text-brand-accent">
                          {user.matric}
                        </p>

                      </div>

                      {/* EMAIL */}

                      <div className="min-w-0">

                        <p className="text-[10px] uppercase tracking-wider text-slate-600 md:hidden">
                          Email
                        </p>

                        <p className="truncate text-sm text-slate-400">
                          {user.email}
                        </p>

                      </div>

                      {/* ACTION */}

                      <div className="flex md:justify-end">

                        <button
                          onClick={() =>
                            setSelectedUser(
                              user
                            )
                          }
                          className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-semibold text-slate-300 transition hover:border-brand-accent/30 hover:bg-brand-accent/10 hover:text-brand-accent"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </button>

                      </div>

                    </div>
                  );
                }
              )}

            </div>

          </div>
        )}

      </div>

      {/* =====================================================
          USER DETAILS MODAL
      ===================================================== */}

      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() =>
            setSelectedUser(null)
          }
        />
      )}

    </div>
  );
}

/*
 * =====================================================
 * STAT CARD
 * =====================================================
 */

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-lg">

      <div className="flex items-start justify-between">

        <div>

          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold text-white">
            {value.toLocaleString()}
          </p>

        </div>

        <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-accent/10 text-brand-accent">
          {icon}
        </div>

      </div>

    </div>
  );
}

/*
 * =====================================================
 * USER DETAILS MODAL
 * =====================================================
 */

function UserDetailsModal({
  user,
  onClose,
}: {
  user: UserType;
  onClose: () => void;
}) {
  const initials =
    user.fullName
      ?.split(" ")
      .map((name) => name[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (
          e.target === e.currentTarget
        ) {
          onClose();
        }
      }}
    >

      {/* BACKDROP */}

      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* MODAL */}

      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl">

        {/* HEADER */}

        <div className="border-b border-white/10 bg-slate-900/90 p-6">

          <div className="flex items-start justify-between gap-4">

            <div className="flex items-center gap-4">

              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-accent/10 text-lg font-bold text-brand-accent">
                {initials || "U"}
              </div>

              <div>

                <p className="text-xs font-semibold uppercase tracking-widest text-brand-accent">
                  Student Profile
                </p>

                <h2 className="mt-1 text-xl font-bold text-white">
                  {user.fullName}
                </h2>

              </div>

            </div>

            <button
              onClick={onClose}
              className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

          </div>

        </div>

        {/* DETAILS */}

        <div className="grid gap-3 p-6 sm:grid-cols-2">

          <Detail
            icon={<Hash className="h-4 w-4" />}
            label="Matric Number"
            value={user.matric}
          />

          <Detail
            icon={<Mail className="h-4 w-4" />}
            label="Email"
            value={user.email}
          />

          <Detail
            icon={<Phone className="h-4 w-4" />}
            label="Phone"
            value={user.phoneNumber || "Not provided"}
          />
{/* 
          <Detail
            icon={
              <GraduationCap className="h-4 w-4" />
            }
            label="Level"
            value={
              user.level
                ? `Level ${user.level}`
                : "Not provided"
            }
          /> */}

          <Detail
            icon={<User className="h-4 w-4" />}
            label="Gender"
            value={
              user.gender || "Not provided"
            }
          />

          <Detail
            icon={
              <CalendarDays className="h-4 w-4" />
            }
            label="Registered"
            value={
              user.createdAt
                ? new Date(
                    user.createdAt
                  ).toLocaleDateString()
                : "Unknown"
            }
          />

        </div>

        {/* FOOTER */}

        <div className="border-t border-white/10 bg-slate-900/70 p-5">

          <button
            onClick={onClose}
            className="h-12 w-full rounded-xl bg-white/5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            Close
          </button>

        </div>

      </div>

    </div>
  );
}

/*
 * =====================================================
 * DETAIL
 * =====================================================
 */

function Detail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">

      <div className="flex items-center gap-2 text-brand-accent">

        {icon}

        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
          {label}
        </span>

      </div>

      <p className="mt-2 truncate text-sm font-semibold text-white">
        {value}
      </p>

    </div>
  );
}