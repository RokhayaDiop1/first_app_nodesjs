const express = require("express");

const app= express();


const produits = [
    {
        id: 1,
        nom: "Robe",
        prix: 25000,
        taille: "M",
        stock: 12
    },
    {
        id: 2,
        nom: "Jean",
        prix: 18000,
        taille: "L",
        stock: 20
    },
    {
        id: 3,
        nom: "Chemise",
        prix: 15000,
        taille: "M",
        stock: 15
    },
    {
        id: 4,
        nom: "Jupe",
        prix: 20000,
        taille: "S",
        stock: 10
    },
    {
        id: 5,
        nom: "T-shirt",
        prix: 10000,
        taille: "XL",
        stock: 25
    },
    {
        id: 6,
        nom: "Veste",
        prix: 30000,
        taille: "L",
        stock: 8
    },
    {
        id: 7,
        nom: "Pantalon",
        prix: 22000,
        taille: "M",
        stock: 14
    },
    {
        id: 8,
        nom: "Sac à main",
        prix: 28000,
        taille: "Unique",
        stock: 7
    },
    {
        id: 9,
        nom: "Foulard",
        prix: 7500,
        taille: "Unique",
        stock: 30
    },
    {
        id: 10,
        nom: "Chaussures",
        prix: 17000,
        taille: "39",
        stock: 9
    }
];


app.use(express.json());

app.get("/produits", (req, res) =>{
    res.status(200).json(produits);
})

app.get("/produits/:id", (req, res) => {
    const id =parseInt( req.params.id);
    const produit = produits.find((produit) => produit.id === id);

    if(produit){
        res.status(200).json({ produit : produit});

    }       
    else{
        res.status(404).json({ message : "Utilisateur non trouvé"});
    };
});


// creer ajouter un nouveau produit avec POST
app.post("/produits", (req, res) => {
    const { nom, prix, taille, stock } = req.body;
    
    if ( nom == undefined || prix == undefined || taille == undefined || stock == undefined){
        return res.status(400).json({ message: "Veillez remplir tout les champs"});
    }

    const existingProduit = produits.find((produit) => produit.nom === nom );
    if(existingProduit){
        return res.status(400).json({message : "le produit existe deja"});
    }

    const produit = {
        id : produits.length + 1,
        nom,
        prix,
        taille,
        stock,

    }

    produits.push(produit);
    res.status(201).json({ produit: produit })
    console.log(produits)

});


// modifier un produit avec PUT


app.put("/produits/:id",(req, res) =>{
    const id = parseInt(req.params.id);
    const produit = produits.find((produit) => produit.id === id );

    if(!produit){
        return res.status(404).json({ message : "produit non trouvé"})
    } 

    const { nom, prix, taille, stock } = req.body;

    if ( nom == undefined || prix == undefined || taille == undefined || stock == undefined){
        return res.status(400).json({ message: "Veillez remplir tout les champs"});
    }

    
    produit.nom = nom;
    produit.prix = prix;
    produit.taille = taille;
    produit.stock = stock;

    res.status(200).json({ message: "produit modifier avec succes", produit: produit});

})


//Modifier partiellement un produit avec patch (modifier le prix du produit)
app.patch("/produits/:id", (req, res) =>{
    const id = parseInt(req.params.id);

    const produit = produits.find((produit) => produit.id === id );

    if(!produit){
        return res.status(404).json({ message : "produit non trouvé"})
    } 

    const { prix } = req.body;

    if (prix !== undefined) {
        produit.prix = prix;

    }

    res.status(200).json({ message: "prix du produit modifier avec succes", produit: produit});
    console.log(produit.prix)
    
})



// supprimer un produit

app.delete("/produits/:id", (req, res) => {

    const id = parseInt(req.params.id);
    const index = produits.findIndex((produit) => produit.id === id);

     if (index === -1) {
        return res.status(404).json({
            message: "produit non trouvé"
        });
    }

    const deletedProduit = produits.splice(index, 1);

    res.status(200).json({
        message: "Utilisateur supprimé avec succès",
        produit: deletedProduit[0]
    });

})


module.exports = app;