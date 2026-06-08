import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      statusVerifikasi: string;
      name?:  string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      statusVerifikasi: string;
      name?:  string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}