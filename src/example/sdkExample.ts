// import express from 'express';
// import { Seedly } from '@codeacme/seedly';

// const app = express();
// const port = 3000;

// app.get('/seed', async (req, res) => {
//   const agent = new Seedly({
//     type: 'sqlite',
//     file: './database.db',
//   });

//   try {
//     await agent.seedTool('orders', 10);
//   } catch (error) {
//     console.error('Error during seeding:', error);
//   }

//   res.send('Seeding started!');
// });

// app.listen(port, () => {
//   console.log(
//     `Test app listening at http://localhost:${port}`,
//   );
// });
