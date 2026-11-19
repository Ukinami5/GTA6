export const CLUB = [0,236];
const stop = (type, label, at, extra={}) => ({type,label,at,...extra});
export const STORY = [
  {id:'first-errand',name:'First Errand',payout:350,
    intro:[['Vera','Welcome to The Gilded Conch, Kai. Every tide brings someone new.'],['Kai','And every new face gets an errand?'],['Vera','Take my package to the beach bar. Keep the salt out of it.']],
    objectives:[stop('package','Collect Vera’s package',CLUB),stop('deliver','Deliver to the beach bar',[210,236],{car:true})]},
  {id:'hot-ice',name:'Hot Ice',payout:650,
    intro:[['Vera','There is a cooler waiting at the pier.'],['Kai','Should I ask what is in it?'],['Vera','Only whether it is still cold. The north market closes soon.']],
    objectives:[stop('package','Pick up the cooler at the pier',[-90,278]),stop('checkpoint','Rush the cooler to the north market',[-210,-140],{car:true,timer:110})]},
  {id:'loud-exit',name:'Loud Exit',payout:900,
    intro:[['Vera','My singer, Luz, needs a ride from Mansion Ridge.'],['Kai','The quiet kind?'],['Vera','She has never made a quiet exit in her life. Get her home.']],
    objectives:[stop('pickup','Pick up Luz at the hill mansions',[140,-210],{car:true,heat:2,line:['Luz','They followed me! Drive, Kai. I sing better alive.']}),stop('deliver','Bring Luz to The Gilded Conch · heat optional',CLUB,{car:true})]},
  {id:'collections',name:'Collections',payout:1100,
    intro:[['Vera','Three old friends have forgotten our arrangements.'],['Kai','How hard should I remind them?'],['Vera','Just park outside. My reputation can do the talking.']],
    objectives:[stop('checkpoint','Visit the canal debtor',[-140,140],{car:true,line:['Debtor','Tell Vera we are square. I like my windows.']}),stop('checkpoint','Visit the market debtor',[-210,0],{car:true,line:['Debtor','The envelope is ready. It was always ready.']}),stop('checkpoint','Visit the avenue debtor',[70,-70],{car:true,line:['Debtor','Paid in full. Please enjoy the rest of your evening.']}),stop('deliver','Return the collections to Vera',CLUB,{car:true})]},
  {id:'neon-tide',name:'Neon Tide',payout:2500,
    intro:[['Vera','Take my Solstice. There is one last case at the marina warehouse.'],['Kai','And after that?'],['Vera','Mansion Ridge. A clean horizon. Perhaps a city we can call ours.']],
    objectives:[stop('vehicle','Take Vera’s sports car',[8,236],{car:true}),stop('package','Collect the warehouse briefcase',[-140,236],{car:true,heat:3,line:['Vera','They know. Reach the hilltop house before the deal disappears.']}),stop('deliver','Deliver the briefcase to the hilltop mansion',[-70,-210],{car:true,timer:130})]}
];
