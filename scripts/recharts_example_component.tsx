import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * Task completion trend visualization component
 */
const data = [
  { name: 'Mon', completed: 4, active: 10 },
  { name: 'Tue', completed: 7, active: 8 },
  { name: 'Wed', completed: 5, active: 12 },
  { name: 'Thu', completed: 10, active: 15 },
  { name: 'Fri', completed: 12, active: 10 },
];

export const TaskTrendDashboard: React.FC = () => {
  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="completed" stroke="#82ca9d" name="已完成任務" />
          <Line type="monotone" dataKey="active" stroke="#8884d8" name="活躍任務" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
