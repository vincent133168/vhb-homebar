import { readCookie, sessionFromRequest, signValue, verifyValue } from "./auth";

const CUSTOMER_COOKIE = "vhb_customer";
const ONE_YEAR = 365 * 24 * 60 * 60 * 1000;

type CustomerToken = { sub:string; exp:number };

export async function customerContextFromRequest(request: Request) {
  const session = await sessionFromRequest(request);
  let guest = await verifyValue<CustomerToken>(readCookie(request.headers.get("cookie"), CUSTOMER_COOKIE));
  let setCookie: string | null = null;
  if (!guest || guest.exp <= Date.now()) {
    guest = { sub:crypto.randomUUID(), exp:Date.now() + ONE_YEAR };
    const token = await signValue(guest);
    setCookie = `${CUSTOMER_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`;
  }
  const guestId = `guest:${guest.sub}`;
  if (session?.role === "user") {
    const userId = `user:${session.sub}`;
    return { primaryId:userId, visibleIds:[userId,guestId], setCookie };
  }
  return { primaryId:guestId, visibleIds:[guestId], setCookie };
}
