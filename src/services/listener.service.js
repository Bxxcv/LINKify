
export class ListenerManager {
  constructor(){ this.listeners = new Set(); }
  register(unsub){
    if(typeof unsub === 'function') this.listeners.add(unsub);
    return unsub;
  }
  cleanup(){
    this.listeners.forEach(fn=>{ try{ fn(); }catch(e){} });
    this.listeners.clear();
  }
}
export const listenerManager = new ListenerManager();
