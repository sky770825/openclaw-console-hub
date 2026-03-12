/**
 * Phase 2 可視化組件參考實作 (Recharts)
 * 適用於：任務狀態統計儀表板
 */
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const data = [
  { status: '待處理', count: 12, color: '#ffc658' },
  { status: '進行中', count: 19, color: '#8884d8' },
  { status: '已完成', count: 25, color: '#82ca9d' },
  { status: '異常', count: 5, color: '#ff8042' },
];

export const TaskStatusOverview = () => {
  return (
    <div style={{ width: '100%', height: 300, backgroundColor: '#f9f9f9', padding: '20px' }}>
      <h3>任務執行狀態概覽</h3>
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="status" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
