
import { collection,getDocs,getDoc,doc,setDoc,updateDoc } from 'firebase/firestore';

export class FirestoreService {
  constructor(db){
    this.db=db;
    this.cache=new Map();
  }

  async getCollection(path, force=false){
    if(!force && this.cache.has(path)) return this.cache.get(path);
    const snap=await getDocs(collection(this.db,path));
    const data=snap.docs.map(d=>({id:d.id,...d.data()}));
    this.cache.set(path,data);
    return data;
  }

  async getDocument(path,id){
    const snap=await getDoc(doc(this.db,path,id));
    return snap.exists()?{id:snap.id,...snap.data()}:null;
  }

  async create(path,id,payload){ return setDoc(doc(this.db,path,id),payload); }
  async update(path,id,payload){ return updateDoc(doc(this.db,path,id),payload); }
  invalidate(key){ this.cache.delete(key); }
}
