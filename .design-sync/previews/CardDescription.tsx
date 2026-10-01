import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button } from 'tabhub';

// CardDescription is one part of the Card composition; shown in place, the way the app uses it.
export const Collection = () => (
  <Card style={{ width: 320 }}>
    <CardHeader>
      <CardTitle>前端开发</CardTitle>
      <CardDescription>12 个书签 · 上次更新 3 天前</CardDescription>
    </CardHeader>
    <CardContent>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8, fontSize: 13 }}>
        <li>React 官方文档 <span style={{ opacity: 0.55 }}>react.dev</span></li>
        <li>Vite 配置参考 <span style={{ opacity: 0.55 }}>vite.dev</span></li>
        <li>Tailwind CSS <span style={{ opacity: 0.55 }}>tailwindcss.com</span></li>
      </ul>
    </CardContent>
    <CardFooter style={{ gap: 8 }}>
      <Button size="sm">打开全部</Button>
      <Button size="sm" variant="ghost">重命名</Button>
    </CardFooter>
  </Card>
);
