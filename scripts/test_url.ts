import fetch from 'node-fetch';

async function test() {
  const raw = 'https://application.yensthai.com/uploads/product-images/42662bac-9b49-4ef6-8d1c-01c071a8f114-Menu à¹\x80à¸\x94à¸µà¸¢à¸§  - 13.png';
  const encoded = encodeURI(raw);
  
  const resRaw = await fetch(raw);
  const resEncoded = await fetch(encoded);
  
  console.log('RAW URL:', raw);
  console.log('RAW FETCH STATUS:', resRaw.status);
  console.log('ENCODED URL:', encoded);
  console.log('ENCODED FETCH STATUS:', resEncoded.status);
}

test();
