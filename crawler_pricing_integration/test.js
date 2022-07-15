const { syncSpu, syncAllSpu, updateMainImageIfChanged } = require('./syncSpu');

async function test() {
  await syncAllSpu(300000, 51);
  console.log('done');
  //const changed = await updateMainImageIfChanged('015110', 'https://cdn.poizon.com/pro-img/origin-img/20220212/6412073b2c9f4a5688dcc94aecb32de4.jpg');
  //console.log(changed);
  //await syncSpu();
}

console.log('Test starts...');
test();
