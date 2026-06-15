import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  where,
  Timestamp 
} from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, type User } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyACy-IDZbWHXinq1DLHG8wTvl634khcoBw",
  authDomain: "eggbucket-d5a75.firebaseapp.com",
  projectId: "eggbucket-d5a75",
  storageBucket: "eggbucket-d5a75.firebasestorage.app",
  messagingSenderId: "30347740123",
  appId: "1:30347740123:web:0082e34aebd76ed4feddfe",
  measurementId: "G-X2KZKHVCZR",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ─── Types ───
export interface OrderData {
  id?: string;
  name: string;
  phone: string;
  latitude: number;
  longitude: number;
  flatNo: string;
  street: string;
  quantity: number;
  pricePerCrate: number;
  totalPrice: number;
  status: "new" | "accepted" | "out" | "delivered";
  assignedTo?: string;
  createdAt: any; // Timestamp
  includeTray?: boolean;
  trayPrice?: number;
  settled?: boolean;
  settledAt?: any; // Timestamp
}

export interface DeliveryExecutive {
  id?: string;
  name: string;
  password: string;
  status: "available" | "busy";
  createdAt?: any; // Timestamp
}

// ─── Auth ───
export const loginAdmin = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

export const logoutAdmin = () => signOut(auth);

export const onAuthChange = (cb: (user: User | null) => void) =>
  onAuthStateChanged(auth, cb);

// ─── Orders ───
export function subscribeToOrders(cb: (orders: OrderData[]) => void) {
  const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as OrderData));
    cb(orders);
  });
}

export async function updateOrderStatus(orderId: string, status: OrderData["status"]) {
  await updateDoc(doc(db, "orders", orderId), { status });
}

export async function assignOrder(orderId: string, executiveId: string) {
  await updateDoc(doc(db, "orders", orderId), {
    assignedTo: executiveId,
  });
}

// ─── Delivery Executives ───
export async function createDeliveryExecutive(name: string, password: string): Promise<string> {
  const snap = await getDocs(collection(db, "deliveryExecutives"));
  const existing = snap.docs.find((d) => d.data().name === name);
  if (existing) throw new Error("Executive with this name already exists");
  const docRef = await addDoc(collection(db, "deliveryExecutives"), { 
    name, 
    password, 
    status: "available",
    createdAt: Timestamp.now()
  });
  return docRef.id;
}

export function subscribeToDeliveryExecutives(cb: (execs: DeliveryExecutive[]) => void) {
  return onSnapshot(collection(db, "deliveryExecutives"), (snapshot) => {
    const execs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as DeliveryExecutive));
    cb(execs);
  });
}

export async function deleteDeliveryExecutive(execId: string) {
  const { deleteDoc } = await import("firebase/firestore");
  await deleteDoc(doc(db, "deliveryExecutives", execId));
}

// ─── Pricing ───
export async function getPrice(): Promise<number> {
  const snap = await getDoc(doc(db, "settings", "pricing"));
  if (snap.exists()) return snap.data().pricePerCrate ?? 180;
  return 180;
}

export async function setPrice(pricePerCrate: number) {
  await setDoc(doc(db, "settings", "pricing"), { pricePerCrate });
}

// ─── Cash Settlement ───
export async function settleAgentCash(execId: string) {
  const q = query(
    collection(db, "orders"), 
    where("assignedTo", "==", execId), 
    where("status", "==", "delivered")
  );
  const snap = await getDocs(q);
  const promises = snap.docs
    .filter(d => !d.data().settled)
    .map(d => updateDoc(d.ref, { 
      settled: true, 
      settledAt: Timestamp.now() 
    }));
  await Promise.all(promises);
}

export { db, auth };
