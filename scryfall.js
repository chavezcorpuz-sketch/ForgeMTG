import axios from 'axios';

export async function fetchCardByName(name) {
  const q = encodeURIComponent(name);
  try {
    const res = await axios.get(`https://api.scryfall.com/cards/named?fuzzy=${q}`);
    return res.data;
  } catch (e) {
    try {
      const res2 = await axios.get(`https://api.scryfall.com/cards/search?q=${q}`);
      if (res2.data && res2.data.data && res2.data.data.length > 0) return res2.data.data[0];
    } catch (e2) {}
    throw e;
  }
}
