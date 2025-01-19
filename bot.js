// Import des modules nécessaires
const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

// Création du client Discord
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Fonction pour récupérer des données depuis Wikidata
async function getRandomWikidataQuestion() {
    const query = `
    SELECT ?item ?itemLabel ?description WHERE {
      ?item wdt:P31 wd:Q5. # Cherche des êtres humains
      ?item wdt:P106 ?occupation. # Avec une profession
      ?occupation rdfs:label ?occupationLabel.
      FILTER (lang(?occupationLabel) = "en")
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    LIMIT 1`;

    const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}&format=json`;

    try {
        const response = await axios.get(url);
        const data = response.data.results.bindings[0];

        return {
            name: data.itemLabel.value,
            description: data.description ? data.description.value : "No description available.",
            url: data.item.value,
        };
    } catch (error) {
        console.error("Erreur lors de la récupération des données :", error);
        return null;
    }
}

// Quand le bot est prêt
client.once('ready', async () => {
    console.log(`Connecté en tant que ${client.user.tag}`);

    // Enregistrement des commandes slash
    const commands = [
        {
            name: 'jeu',
            description: 'Lance une question basée sur Wikidata',
        },
    ];

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log('Enregistrement des commandes slash...');
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Commandes enregistrées avec succès.');
    } catch (error) {
        console.error("Erreur lors de l'enregistrement des commandes :', error");
    }
});

// Gestion des commandes slash
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'jeu') {
        await interaction.deferReply();

        const question = await getRandomWikidataQuestion();

        if (question) {
            await interaction.editReply(
                `**Devinez la personne décrite !**\n\nDescription : ${question.description}\n\nIndice : Vous pouvez en savoir plus ici : ${question.url}`
            );
        } else {
            await interaction.editReply("Désolé, je n'ai pas pu récupérer de données pour l'instant. Réessayez plus tard !");
        }
    }
});

// Connexion au bot
client.login(process.env.DISCORD_TOKEN);
