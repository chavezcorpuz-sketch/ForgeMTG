import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, Alert } from 'react-native';
import { loadCollection, decrementOrRemove, clearAll } from '../storage/collection';
import CardRow from './CardRow';

export default function CollectionView({ onBack, onSetCommander }) {
  const [list, setList] = useState([]);

  useEffect(() => {
    (async () => {
      const l = await loadCollection();
      setList(l);
    })();
  }, []);

  async function removeOne(item) {
    const next = await decrementOrRemove(item.id);
    setList(next);
  }

  async function clearCollection() {
    Alert.alert('Clear collection?', 'This will delete your saved collection', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => { await clearAll(); setList([]); } }
    ]);
  }

  return (
    <View style={{ flex: 1, padding: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: '700' }}>My Collection</Text>
      {list.length === 0 ? <Text style={{ marginTop: 12 }}>No cards yet</Text> : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.id || item.name}
          renderItem={({ item }) => (
            <CardRow item={item} onSetCommander={(c)=>onSetCommander(c)} onRemove={() => removeOne(item)} />
          )}
        />
      )}
      <View style={{ marginTop: 12 }}>
        <Button title="Clear collection" color="#FF3B30" onPress={clearCollection} />
      </View>
      <View style={{ marginTop: 12 }}>
        <Button title="Back" onPress={onBack} />
      </View>
    </View>
  );
}
