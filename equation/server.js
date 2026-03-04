import express from 'express';
import OpenAI from 'openai';

const app = express();
app.use(express.json());
app.use(express.static('.'));

const openai = new OpenAI();

app.post('/api/ai', async (req, res) => {
  const { prompt, exercise } = req.body;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        {
          role: "system",
          content: "Tu es un assistant pédagogique en mathématiques. Aide l'élève à comprendre l'exercice sans donner directement la réponse si possible. L'exercice est une équation visuelle."
        },
        {
          role: "user",
          content: `L'exercice actuel est : ${JSON.stringify(exercise)}. L'élève demande : ${prompt}`
        }
      ],
    });

    res.json({ answer: completion.choices[0].message.content });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur lors de la génération de la réponse." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
