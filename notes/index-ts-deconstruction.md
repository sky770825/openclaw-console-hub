# index.ts 拆解分析

根據初步觀察，index.ts 承載了過多路由與中間件。建議將路由抽離至 server/src/routes/。