import React, { useState } from 'react';
import { SafeAreaView, View, Text, Button } from 'react-native';
import Scanner from './components/Scanner';
import CollectionView from './components/CollectionView';
import DeckBuilder from './components/DeckBuilder';

export default function App() {
  const [screen, setScreen] = useState('home');
  const [commanderFromCollection, setCommanderFromCollection] = useState(null);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {screen === 'home' && (
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 28, fontWeight: '800' }}>ForgeMTG</Text>
          <View style={{ height: 16 }} />
          <Button title="Scan Card (ManaBox style)" onPress={() => setScreen('scan')} />
          <View style={{ height: 8 }} />
          <Button title="My Collection" onPress={() => setScreen('collection')} />
          <View style={{ height: 8 }} />
          <Button title="Build Commander Deck (EDHRec style)" onPress={() => setScreen('deck')} />
        </View>
      )}

      {screen === 'scan' && <Scanner onBack={() => setScreen('home')} />}
      {screen === 'collection' && (
        <CollectionView
          onBack={() => setScreen('home')}
          onSetCommander={(c) => { setCommanderFromCollection(c); setScreen('deck'); }}
        />
      )}
      {screen === 'deck' && <DeckBuilder onBack={() => setScreen('home')} commanderFromCollection={commanderFromCollection} />}
    </SafeAreaView>
  );
}
