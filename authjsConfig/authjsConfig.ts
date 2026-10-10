import { LoginResponseType, LoginSchemaType } from "@/app/login/login.interface";
import { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

declare module "next-auth" {
    interface User {
        access_token:string
        role: string
        id?: string | number; 
    }

    interface Session {
    user: {
      id?: string;
      role?: string;
      image?: string | null;
      loginAt?: number;       // تاريخ الدخول الأول (Timestamp)
      loginDate?: string;     // تاريخ الدخول الأول (ISO String)
    } & import("next-auth").DefaultSession["user"];
  }
}

export const authConfig:NextAuthConfig = {
   session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
  },
  jwt: {
    maxAge: 60 * 60 * 24 * 7,
  },
    providers: [
        Credentials({
            name: "Login MCIT_TEST",
            credentials:{
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
            authorize: async function(credential) {
                const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/login`, {
                            method: "POST",
                            headers: {
                                "content-type" : "application/json",
                            },
                            body: JSON.stringify(credential)
                        })

                        if(!response.ok) {
                            return null;
                        }

                        const data:LoginResponseType = await response.json()
                        

                            const {user:{name,email,photo,role,id}, access_token} = data
                            return {name,email,image: photo,access_token, role, id: String(id)}
                        
                        
                        
                
            },
        
        })
    ],
    pages: {
        signIn: '/login'
    },
    callbacks: {
        jwt: function({token, user, trigger, session}) {
            if(user) {
                token.credentialToken = user.access_token;
                token.picture = user.image;
                token.role = user.role;
                token.loginAt = Date.now();
                token.loginDate = new Date().toISOString();
                token.id = user.id;
            }
            if(trigger === "update") {
                const newImage = session?.image || session?.user?.image || session?.picture;
                if(newImage) {
                    token.picture = newImage;
                }
            }

            return token;
        },

        session: function({session, token, user}) {
            session.user.role = token.role as string;
            session.user.image = (token.picture as string) || session.user?.image;
            session.user.loginAt = token.loginAt as number;
            session.user.loginDate = token.loginDate as string;
            session.user.id = token.id as string
            return session;
        }
    }
}