import osmPbf from 'osm-pbf-parser';
console.log('Type:', typeof osmPbf);
console.log('Keys:', Object.keys(osmPbf));
if (typeof osmPbf === 'function') {
  const parser = osmPbf();
  console.log('Parser:', parser.constructor.name);
  console.log('Writable:', typeof parser.write);
  console.log('Readable:', typeof parser.read);
}
