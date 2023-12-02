import { parseString } from "xml2js";

export default async function parseXML<T = any>(src: string): Promise<T> {
  return new Promise((resolve, reject) =>
    parseString(src, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    })
  );
}
