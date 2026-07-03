"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

export const SystemActionGrid: React.FC = () => {
  const router = useRouter();

  const actions = [
    {
      title: 'Tạo trip mới',
      desc: 'Bắt đầu hành trình mới cực nhanh với AI Planner.',
      icon: 'auto_awesome',
      path: '/planner',
      color: '#FFD166',
      btnText: 'Lập kế hoạch'
    },
    {
      title: 'Khám phá địa điểm',
      desc: 'Tìm kiếm địa danh du lịch, quán ngon & điểm check-in.',
      icon: 'explore',
      path: '/explore',
      color: '#20A7D8',
      btnText: 'Khám phá bản đồ'
    },
    {
      title: 'Xem trips đã lưu',
      desc: 'Quay lại quản lý thư viện các hành trình cá nhân của bạn.',
      icon: 'map',
      path: '/trips',
      color: '#B8F24A',
      btnText: 'Thư viện chuyến đi'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ width: '100%', fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      {actions.map((item) => (
        <Card
          key={item.title}
          interactive
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 180,
            padding: 16,
            boxSizing: 'border-box'
          }}
        >
          <div className="space-y-2">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  border: '1.5px solid #111111',
                  backgroundColor: item.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#111111' }}>{item.icon}</span>
              </span>
              <h5 style={{ fontSize: 13, fontWeight: 900, color: '#111111', margin: 0 }}>
                {item.title}
              </h5>
            </div>
            <p style={{ fontSize: 11, color: '#7A6A58', fontWeight: 650, lineHeight: 1.4, margin: 0 }}>
              {item.desc}
            </p>
          </div>

          <div style={{ paddingTop: 12 }}>
            <Button
              variant="secondary"
              size="sm"
              style={{ width: '100%' }}
              onClick={() => router.push(item.path)}
            >
              {item.btnText}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
};
