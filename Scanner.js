import React, { useState, useEffect } from 'react';
import { View, Text, Button, ActivityIndicator, Alert, Image, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import axios from 'axios';
import { addOrIncrement } from '../storage/collection';
import { fetchCardByName } from '../api/scryfall';

// IMPORTANT: replace this with your server host (e.g., http://192.168.1.100:3333)
const SERVER_URL = 'http://YOUR_SERVER_HOST:3333';

export default function Scanner({ onBack }) {
  const [processing, setProcessing] = useState(false);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') Alert.alert('Camera permission required for scanning');
    })();
  }, []);

  async function takePhotoAndUpload() {
    try {
      const r = await ImagePicker.launchCameraAsync({ quality: 0.6, base64: false });
      if (r.cancelled) return;
      setPreview(r.uri);
      setProcessing(true);

      const manip = await ImageManipulator.manipulateAsync(r.uri, [{ resize: { width: 1200 } }], { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG });
      const form = new FormData();
      form.append('image', {
        uri: manip.uri,
        name: 'card.jpg',
        type: 'image/jpeg'
      });

      const resp = await axios.post(`${SERVER_URL}/recognize`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000
      });

      const { ocrText, scryfall } = resp.data || {};
      if (scryfall) {
        await addOrIncrement(scryfall);
        Alert.alert('Added', `${scryfall.name} added to collection`);
      } else {
        Alert.alert('No direct match', 'OCR returned text but no Scryfall match. You can try manual search.', [
          { text: 'Manual Search', onPress: () => manualSearch(ocrText) },
          { text: 'Cancel' }
        ]);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', String(e));
    } finally {
      setProcessing(false);
    }
  }

  async function manualSearch(ocrText = '') {
    const prompt = Platform.OS === 'web' ? window.prompt : null;
    if (prompt) {
      const text = prompt('Enter card name (or use OCR text):', ocrText);
      if (!text) return;
      try {
        const card = await fetchCardByName(text);
        await addOrIncrement(card);
        Alert.alert('Added', `${card.name} added`);
      } catch (err) {
        Alert.alert('Not found', String(err));
      }
    } else {
      Alert.alert('Manual search not supported in this environment');
    }
  }

  return (
    <View style={{ flex: 1, padding: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: '700' }}>Scan Card</Text>
      <Text style={{ marginTop: 8, color: '#666' }}>Take a clear photo of the front of the card (name should be visible)</Text>

      <View style={{ marginTop: 12 }}>
        <Button title="Take Photo" onPress={takePhotoAndUpload} />
      </View>

      {processing && <ActivityIndicator style={{ marginTop: 12 }} size="large" />}

      {preview && <Image source={{ uri: preview }} style={{ width: '100%', height: 240, marginTop: 12 }} />}

      <View style={{ marginTop: 12 }}>
        <Button title="Back" onPress={onBack} />
      </View>
    </View>
  );
}
