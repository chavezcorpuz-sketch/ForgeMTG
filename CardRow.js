import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export default function CardRow({ item, onSetCommander, onRemove }) {
  return (
    <View style={{ flexDirection: 'row', padding: 8, borderBottomWidth: 1, borderColor: '#eee', alignItems:'center' }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '600' }}>{item.name} {item.count ? `x${item.count}` : ''}</Text>
        <Text style={{ color:'#666' }}>{item.type_line || ''}</Text>
      </View>
      <TouchableOpacity onPress={() => onSetCommander(item)} style={{ padding: 6, backgroundColor: '#34C759', borderRadius: 6, marginRight: 8 }}>
        <Text style={{ color: 'white' }}>Commander</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onRemove(item)} style={{ padding: 6, backgroundColor: '#FF3B30', borderRadius: 6 }}>
        <Text style={{ color: 'white' }}>-1</Text>
      </TouchableOpacity>
    </View>
  );
}
