import React, { useState, useEffect } from 'react';
import { View, Text, Button, FlatList, Alert, TextInput } from 'react-native';
import axios from 'axios';
import { loadCollection } from '../storage/collection';

// IMPORTANT: replace with your server IP e.g. http://192.168.1.100:3333
const SERVER_URL = 'http://YOUR_SERVER_HOST:3333';

export default function DeckBuilder({ onBack, commanderFromCollection }) {
  const [collection, setCollection] = useState([]);
  const [commanderName, setCommanderName] = useState(commanderFromCollection ? commanderFromCollection.name : '');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(()=>{ (async()=> setCollection(await loadCollection()))(); }, []);

  async function analyze(commander) {
    setLoading(true);
    try {
      const resp = await axios.post(`${SERVER_URL}/analyze-archetype`, { commander_name: commander, collection });
      setResult(resp.data);
      if (!resp.data.commander && resp.data.suggestions && resp.data.suggestions.length > 0) {
        Alert.alert('No commander found', 'But here are suggestions from your collection.');
      }
    } catch (e) {
      Alert.alert('Error', String(e));
    } finally {
      setLoading(false);
    }
  }

  function exportDeck() {
    if (!result) return;
    const lines = [];
    if (result.commander) lines.push(`Commander: ${result.commander.name}`);
    result.deck.forEach((d, idx) => {
      if (idx === 0) return; // skip commander in numbered listing
      lines.push(`${d.name} ${d.owned ? '' : '(missing)'}`);
    });
    const text = lines.join('\n');
    // copy to clipboard or show
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) navigator.clipboard.writeText(text);
      Alert.alert('Deck exported', 'Deck text copied to clipboard');
    } catch (e) {
      Alert.alert('Deck text', text);
    }
  }

  return (
    <View style={{ flex: 1, padding: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: '700' }}>Commander Deck Builder</Text>

      <Text style={{ marginTop: 8 }}>Type commander name (or pick from collection)</Text>
      <TextInput value={commanderName} onChangeText={setCommanderName} placeholder="Commander name" style={{ borderWidth: 1, borderColor: '#ddd', padding: 8, marginTop: 8, borderRadius: 6 }} />

      <View style={{ marginTop: 8 }}>
        <Button title="Build" onPress={() => analyze(commanderName)} />
      </View>

      {loading && <Text style={{ marginTop: 8 }}>Building deck...</Text>}

      {result && (
        <View style={{ marginTop: 12 }}>
          <Text style={{ fontWeight: '700' }}>Result</Text>
          <Text>Commander: {result.commander ? result.commander.name : 'None'}</Text>
          <Text>Top tag: {result.topTag || '—'}</Text>
          <Text>Owned: {result.summary.owned} / {result.summary.total}</Text>

          <Text style={{ marginTop: 8, fontWeight: '600' }}>Deck (owned / missing)</Text>
          <FlatList
            data={result.deck}
            keyExtractor={(item, idx)=> item.name + idx}
            renderItem={({ item, index }) => (
              <View style={{ flexDirection:'row', justifyContent:'space-between', paddingVertical:4 }}>
                <Text>{index===0 ? `(C) ${item.name}` : item.name}</Text>
                <Text style={{ color: item.owned ? 'green' : 'red' }}>{index===0 ? '' : (item.owned ? 'owned' : 'missing')}</Text>
              </View>
            )}
          />
          <View style={{ marginTop: 8 }}>
            <Button title="Export deck text" onPress={exportDeck} />
          </View>
        </View>
      )}

      <View style={{ marginTop: 12 }}>
        <Button title="Back" onPress={onBack} />
      </View>
    </View>
  );
}
