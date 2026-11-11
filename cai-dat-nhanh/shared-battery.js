/* Displays only actual v=<millivolts> telemetry. Never polls or writes BLE. */
(function(root){
 'use strict';
 let connected=false,millivolts=null;
 const text=s=>root.EpdWebsiteI18n?.translate(s)||s;
 function render(){
  const value=root.document.getElementById('shared-battery-value'),hint=root.document.getElementById('shared-battery-hint');
  if(!value||!hint)return;
  value.textContent=millivolts===null?text(connected?'Not reported by this clock.':'Not connected'):`${(millivolts/1000).toFixed(2)} V (${millivolts} mV)`;
  hint.textContent=text(connected?(millivolts===null?'Voltage appears when the clock sends a measurement.':'Measured by the connected clock.'):'Connect a clock to view its battery voltage.');
 }
 root.SharedBattery={
  setConnected(value){connected=!!value;millivolts=null;render();},
  notification(bytes){
   if(!connected||!bytes||bytes.length<5||bytes.length>12)return false;
   const message=String.fromCharCode(...bytes),match=/^v=(\d{3,5})\s*$/.exec(message);
   if(!match)return false;
   const value=Number(match[1]);millivolts=value>=500&&value<=10000?value:null;render();return true;
  },render
 };
})(globalThis);
