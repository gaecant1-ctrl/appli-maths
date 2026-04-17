// Initialisation du score et du compteur de questions
let questionCount = 0;
let score = 0;

// Stockage des expressions déjà utilisées
const usedExpressions = [];


const skipButton = document.getElementById("skipButton");

skipButton.addEventListener("mouseenter", () => {
  skipButton.innerHTML = "😢";
});

skipButton.addEventListener("mouseleave", () => {
  skipButton.innerHTML = "Renoncer";
});



// ==========================
// ✅ Classe : Expression
// ==========================
class Expression {
  constructor(expr, minReduc) {
    this.expr = this.autoInsertMultiplication(expr);
    this.exprFacto = this.autoInsertMultiplication(minReduc);
    this.exprOpe = this.countOperations(this.expr);
    this.exprFactoOpe = this.countOperations(this.exprFacto);
  }

  // 🔧 Insère automatiquement des signes de multiplication là où ils sont implicites
  autoInsertMultiplication(expression) {
    expression = expression.replace(/([0-9a-zA-Z\)])\(/g, '$1*(');
    expression = expression.replace(/([0-9])([a-zA-Z])/g, '$1*$2');
    expression = expression.replace(/\)([a-zA-Z])/g, ')*$1');
    expression = expression.replace(/[a-zA-Z]{2,}/g, match =>
      match.split('').join('*')
    );
  
    return expression;
  }

  // 🔧 Nettoie les expressions pour mieux compter les opérations
  autoCleanExpression(expr) {
    expr = expr.replace(/^-/, 'NEG');
    expr = expr.replace(/([\+\-\*\/\(])\s*-/g, '$1NEG');
    console.log(expr);
    return expr;
  }

  // 🧮 Compte les opérations dans l'expression
  countOperations(expr) {
      expr = this.autoCleanExpression(expr);
    
      const operationCount = {
        multiplication: (expr.match(/\*/g) || []).length,
        addition: (expr.match(/\+/g) || []).length,
        subtraction: (expr.match(/-/g) || []).length,
        exponentiation: 0,
      };
    
      // Comptage spécial pour les puissances : ^n = (n - 1) opérations
      const exponentMatches = [...expr.matchAll(/\^(\d+)/g)];
      for (const match of exponentMatches) {
        const power = parseInt(match[1], 10);
        if (power > 1) {
          operationCount.exponentiation += power - 1;
        } else {
          // ^1 ou ^0 ne comptent pas comme opération exponentielle significative
          operationCount.exponentiation += 0;
        }
      }
    
        // Corriger les faux positifs avec les négatifs
        operationCount.subtraction -= (expr.match(/NEG/g) || []).length;
    
        return operationCount.multiplication +
               operationCount.addition +
               operationCount.subtraction +
               operationCount.exponentiation;
  }

  // 🔎 Vérifie si l'expression est bien évaluable avec des valeurs aléatoires
  evaluated() {
  try {
    // Extraire toutes les lettres utilisées comme variables (a-z)
    const variables = Array.from(new Set(this.expr.match(/[a-z]/g))) || [];

    const testValues = [1, 2, 3, -1, 0.5];

    for (let i = 0; i < 5; i++) {
      const scope = {};

      // Remplir le scope avec des valeurs aléatoires
      variables.forEach(v => {
        scope[v] = testValues[Math.floor(Math.random() * testValues.length)];
      });

      // Évaluer l'expression
      const result = math.evaluate(this.expr, scope);

      // Vérifier qu'aucune variable n'est restée non définie
      // (math.js pourrait renvoyer un SymbolNode ou NaN sans erreur)
      if (typeof result !== 'number' || !isFinite(result)) {
        return false;
      }

      // Vérification supplémentaire : s'assurer qu'aucune variable ne reste non évaluée
      if (String(result).match(/[a-z]/i)) {
        return false;
      }
    }

    return true;
  } catch (e) {
    console.error("Erreur d’évaluation :", e.message);
    return false;
  }
}



  // 🔁 Compare l'expression de l'utilisateur avec l'expression originale
 checkEqual(userExpr) {
  const testValues = [1, 2, -1, 0.5, 3, -2];
  const attempts = 5;

  try {
    const getVariables = expr =>
      Array.from(new Set(
        math.parse(expr).filter(n => n.isSymbolNode).map(n => n.name)
      ));

    const vars1 = getVariables(this.expr);
    const vars2 = getVariables(userExpr.expr);

    const allVars = Array.from(new Set([...vars1, ...vars2]));

    for (let i = 0; i < attempts; i++) {
      const scope = {};
      allVars.forEach(v => {
        scope[v] = testValues[Math.floor(Math.random() * testValues.length)];
      });

      const val1 = math.evaluate(this.expr, scope);
      const val2 = math.evaluate(userExpr.expr, scope);

      if (Math.abs(val1 - val2) > 1e-6) {
        return false;
      }
    }

    return true;
  } catch (e) {
    console.error("Erreur dans checkEqual:", e.message);
    return false;
  }
}

}

// ===============================
// 🧠 Génère une expression aléatoire
// ===============================
function generateRandomExpression() {
  const types = [
    { pattern: 'ab^2 + ua^2b', operation: '+', constants: ['u'], minReduc: 'ab(b+ua)' },
    { pattern: 'ab^2 + ucab', operation: '+', constants: ['u'], minReduc: 'ab(b+uc)' },
    { pattern: 'ux^2 + vx', operation: '+', constants: ['u', 'v'], minReduc: 'x(ux+v)' },
    { pattern: 'ux + vx', operation: '+', constants: ['u', 'v'], minReduc: '(u+v)x' },
    { pattern: 'uabc + vac', operation: '+', constants: ['u', 'v'], minReduc: '(ub+v)ac' },
    { pattern: 'uab + vca', operation: '+', constants: ['u', 'v'], minReduc: '(ub+vc)a' },
    { pattern: 'uac + vbac', operation: '+', constants: ['u', 'v'], minReduc: '(u+vb)ac' },
    { pattern: 'ux + vx^2', operation: '+', constants: ['u', 'v'], minReduc: 'x(u+vx)' },
    { pattern: 'ux^2 + vx^2', operation: '+', constants: ['u', 'v'], minReduc: '(u+v)x^2' },
    { pattern: 'ux^3 + vx^2', operation: '+', constants: ['u', 'v'], minReduc: 'x^2(ux+v)' },
    { pattern: 'uabc + vcba', operation: '+', constants: ['u', 'v'], minReduc: 'abc(u+v)' },
  ];

  const variables = ['x', 'y', 'z', 'a', 'b', 'c'];
  const randomType = types[Math.floor(Math.random() * types.length)];
  let exprPattern = randomType.pattern;

  const letters = Array.from(new Set(exprPattern.match(/[a-z]/g) || []));
  const lettersToReplace = letters.filter(l => !randomType.constants.includes(l));

  const availableVariables = [...variables];
  const variableMap = {};
  const constantValues = {};

randomType.constants.forEach(constant => {
  // On génère un nombre entre 0 et 1
  const forceOne = Math.random(); 

  if (forceOne < 0.4) { 
    // 40% de chance d'avoir exactement 1
    constantValues[constant] = 1;
  } else {
    // 60% de chance d'avoir un nombre entre 2 et 9
    constantValues[constant] = Math.floor(Math.random() * 8) + 2;
  }
});

  lettersToReplace.forEach(letter => {
    if (availableVariables.length > 0) {
      const index = Math.floor(Math.random() * availableVariables.length);
      variableMap[letter] = availableVariables.splice(index, 1)[0];
    }
  });

  let expr = exprPattern.replace(/[a-z]/g, (char) => {
    if (randomType.constants.includes(char)) return constantValues[char];
    return variableMap[char] || char;
  });

  const randOp = Math.random() < 0.5 ? '+' : '-';
  expr = expr.replace(randomType.operation, randOp);

  // ===> Mise à jour de minReduc
  let updatedMinReduc = randomType.minReduc
    .replace(/[a-z]/g, c => variableMap[c] || c);

  randomType.constants.forEach(constant => {
    updatedMinReduc = updatedMinReduc.replace(new RegExp(constant, 'g'), constantValues[constant]);
  });

  // Remplace aussi l'opération dans minReduc si elle est dans une forme simple (comme a+b, ub+v, etc.)
  if (randomType.operation === '+' && randOp === '-') {
    updatedMinReduc = updatedMinReduc.replace(/\+/g, '-');
  }

  return new Expression(expr, updatedMinReduc);
}


// ===========================
// 🚀 Lancement du quiz
// ===========================
function startQuiz() {
  console.log("Question actuelle :", questionCount);
  
  if (questionCount < 10) {
    const expressionObj = generateRandomExpression();
    askQuestion(expressionObj);
    questionCount++;
  } else {
    console.log("Fin du quiz !");

    // Nettoie l’écran
    const allDivs = document.querySelectorAll('div');
    allDivs.forEach(div => {
      if (div.id !== 'score') div.remove();
    });

    // Si l’élément score n’existe pas, on le crée
    let scoreElement = document.getElementById("score");
    if (!scoreElement) {
      scoreElement = document.createElement("div");
      scoreElement.id = "score";
      document.body.appendChild(scoreElement);
    }

    showScore();
  }
}




window.addEventListener('load', startQuiz);

// ================================
// Les effets confettis 
// ================================

function showScore() {
   confetti.reset();
  const scoreElement = document.getElementById("score");
  
  // Préparation du score
  scoreElement.textContent = `🎯 Score final : ${score}/${questionCount}`;
  scoreElement.style.fontSize = '28px';
  scoreElement.style.textAlign = 'center';
  scoreElement.style.color = '#4CAF50';
  scoreElement.style.marginTop = '40px';
  
  // Positionnement du score au centre
  scoreElement.style.position = 'absolute';
  scoreElement.style.top = '50%';
  scoreElement.style.left = '50%';
  scoreElement.style.transform = 'translate(-50%, -50%)';
  
  // Masquer le score avant l'animation
  scoreElement.style.opacity = 0;
  scoreElement.style.transition = 'opacity 1s ease-in-out, transform 1s ease-in-out';

  // Un petit délai pour s'assurer que le score n'est pas visible avant l'animation
  setTimeout(() => {
    // Rendre visible et centrer avec effet fluide
    scoreElement.style.opacity = 1;
    scoreElement.style.transform = 'translate(-50%, -50%) scale(1)';
  }, 100);

  // 💥 Effet Feu d'Artifice avec explosions spectaculaires et couleurs vives
if (questionCount > 0 && score / questionCount >= 0.8) {
  const interval = setInterval(() => {
    confetti({
      particleCount: 200,
      angle: 90, // vers le haut
      spread: 180+Math.random()*180, // éventail serré
      startVelocity: 25,
      origin: {
        x: Math.random(),  // 🎯 milieu de l'écran
        y: Math.random()    // depuis le bas
      },
      colors: ['#FF1493', '#FFD700', '#00BFFF', '#00FF00', '#FF4500'],
      gravity: 0.6,
      scalar: 1.9,
      ticks: 250,
      shapes: ['circle'],
      useWorker: false
    });
  }, 400);

  setTimeout(() => {
    clearInterval(interval);
  }, 4000);
}
}






function showConfetti() {
   console.log("Show Confetti triggered");  // Vérification de l'appel à la fonction
   if (typeof confetti !== 'undefined') {
     confetti.reset(); // 💥 Réinitialise avant de lancer une nouvelle animation
     
     // Déclenche l'effet de confettis
     confetti({
       particleCount: 200,      // Nombre de confettis
       angle: 90,               // Angle de lancement des confettis
       spread: 90,              // Étendue du lancer
       origin: { x: 0.5, y: 0.5 }, // Origine du lancer (centré sur l'écran)
       colors: ['#ff0', '#0f0', '#00f', '#f00'], // Couleurs des confettis
       useWorker: false // 🛑 Important sur Trinket
     });

     console.log("Confetti launched!");  // Vérification de l'animation
   } else {
     console.error("La fonction confetti n'est pas définie !");
   }
}



// ================================
// ❓ Pose une question à l'utilisateur
// ================================
function askQuestion(expressionObj) {
  let expression = expressionObj.expr;
  
  // LOG 1 : L'expression brute générée
  console.log("1. Brute (objet) :", expression);

  // Préparation multiplications
  expression = expression.replace(/([0-9a-zA-Z\)])\(/g, '$1*(');
  expression = expression.replace(/([0-9])([a-zA-Z])/g, '$1*$2');
  expression = expression.replace(/([a-zA-Z])([a-zA-Z])/g, '$1*$2');

  // LOG 2 : Après insertion des étoiles
  console.log("2. Avec étoiles :", expression);

  let node = math.parse(expression);
  let latex = node.toTex({ parenthesis: 'keep', implicit: 'hide' });

// LOG 3 : Le LaTeX avant nettoyage
  console.log("3. LaTeX avant :", JSON.stringify(latex)); // JSON.stringify pour voir les caractères cachés

  // NETTOYAGE RADICAL
  // On cible le "1" suivi de n'importe quoi (espaces, cdot, accolades) jusqu'à la première lettre
  // [^0-9] permet de s'assurer qu'on ne touche pas à "11", "21", etc.
  
  // 1. On traite le "1" au début de l'expression
  latex = latex.replace(/^1(\\cdot|\s|\\?)*([a-z\{])/g, '$2');
  
  // 2. On traite le "1" après un signe + ou -
  latex = latex.replace(/([+\-])\s*1(\\cdot|\s|\\?)*([a-z\{])/g, '$1$3');

  // 3. Nettoyage final des points et espaces en trop
  latex = latex.replace(/\\cdot/g, '');
  latex = latex.replace(/\s+/g, ' ').trim();

  // LOG 4 : Le LaTeX final
  console.log("4. LaTeX final :", JSON.stringify(latex));

  const expressionElement = document.getElementById("expression");
  expressionElement.innerHTML = `\\(${latex}\\)`;
  
  if (window.MathJax) {
    MathJax.typesetPromise();
  }

  // --- Suite du code inchangée ---
  expressionElement.classList.remove('expression');
  void expressionElement.offsetWidth;
  expressionElement.classList.add('expression');

  const inputContainer = document.createElement("div");
  inputContainer.id = "inputContainer";
  document.body.appendChild(inputContainer);

  new InputWrapper(expressionObj, inputContainer);

  inputContainer.addEventListener('inputStatus', (event) => {
    const status = event.detail;
    if (status === 'factorized') {
      createNextQuestionButton();
    } else {
      new InputWrapper(expressionObj, inputContainer);
    }
  });
}


// =============================
// ➕ Bouton pour question suivante
// =============================
function createNextQuestionButton() {
  const buttonContainer = document.createElement('div');
  buttonContainer.className = "center-button";
  const oldContainer = document.getElementById("inputContainer");

  const nextButton = document.createElement('button');
  // On précise bien à l'élève qu'il peut utiliser Entrée
  nextButton.textContent = "Question suivante (↵)";

  const goNext = () => {
    // Très important : on enlève l'écouteur global avant de partir
    window.removeEventListener('keydown', handleNextKey);
    if (oldContainer) oldContainer.remove();
    updateScore(true);
    startQuiz();
  };

  const handleNextKey = (event) => {
    if (event.key === "Enter") {
      goNext();
    }
  };

  // On attend 200ms avant d'activer le clavier pour la suite
  // Ça laisse le temps au premier "Entrée" de finir son job
  setTimeout(() => {
    window.addEventListener('keydown', handleNextKey);
  }, 200);

  nextButton.addEventListener('click', goNext);
  buttonContainer.appendChild(nextButton);
  oldContainer.appendChild(buttonContainer);
  showConfetti();
}

// ❌ Bouton renoncer
document.getElementById('skipButton').addEventListener('click', () => {
  const oldContainer = document.getElementById("inputContainer");
  if (oldContainer) oldContainer.remove();
  updateScore(false);
  startQuiz();
});

// 🔢 Met à jour le score
function updateScore(correct) {
  if (correct) score++;
  document.getElementById("score").textContent = `Score : ${score}/${questionCount}`;
}

// ==============================
// 📥 Classe : InputWrapper
// ==============================
class InputWrapper {
  constructor(expressionObj, container) {
    this.status = null;
    this.expressionObj = expressionObj;
    this.container = container;

    this.wrapper = document.createElement('div');
    this.wrapper.classList.add('input-wrapper');
    this.wrapper.style.display = 'flex';
    this.wrapper.style.alignItems = 'center';
    this.wrapper.style.marginBottom = '10px';

    this.input = document.createElement('input');
    this.input.type = "text";
    this.input.placeholder = "Écris ta réponse ici";

    this.comment = document.createElement('div');
    this.comment.style.marginLeft = '15px';
    this.comment.style.fontSize = '18px';
    this.comment.style.display = 'flex';
    this.comment.style.alignItems = 'center';

    this.equalSign = document.createElement('span');
    this.equalSign.textContent = "=";
    this.equalSign.classList.add('equal-sign');

    this.wrapper.appendChild(this.equalSign);
    this.wrapper.appendChild(this.input);
    this.wrapper.appendChild(this.comment);
    this.container.appendChild(this.wrapper);
    this.input.focus();

    this.input.addEventListener("keydown", (event) => this.handleInput(event));
  }

handleInput(event) {
  if (this.status !== null) return;
  if (event.key === "Enter") {
    event.preventDefault(); // <--- Ajoute cette ligne
    this.userAnswer = new Expression(this.input.value, "");
    const result = this.checkAnswer();
    this.processAnswer(result);
  }
}

  checkAnswer() {
    const isEvaluable = this.userAnswer.evaluated();
    const isEqual = this.expressionObj.checkEqual(this.userAnswer);
    const isFactorized = this.checkFactorization();
    return { isEvaluable, isEqual, isFactorized };
  }

  checkFactorization() {
    const originalOperations = this.expressionObj.exprOpe;
    const minReducOperations = this.expressionObj.exprFactoOpe;
    const userOperations = this.userAnswer.exprOpe;

    if (userOperations > originalOperations) return false;
    if (userOperations > minReducOperations && userOperations < originalOperations) return 'insufficient';
    return userOperations <= minReducOperations;
  }

  processAnswer(result) {
    try {
    let latex = math.parse(this.userAnswer.expr).toTex({ parenthesis: 'keep', implicit: 'show' });
    
    // Remplace \cdot devant un chiffre (ou {chiffre})
    latex = latex.replace(/\\cdot\s*(?=\{?\d)/g, '\\times');
    
    // Supprime les autres \cdot inutiles
    latex = latex.replace(/\\cdot/g, '');

    const latexDiv = document.createElement('div');
    latexDiv.innerHTML = `\\(${latex}\\)`;
      latexDiv.style.fontSize = '22px';
      latexDiv.style.marginRight = '15px';
      this.wrapper.insertBefore(latexDiv, this.input);
      this.input.remove();
      MathJax.typesetPromise();
    } catch (e) {
      console.error("Erreur de rendu Latex : ", e.message);
    }

    this.displayComment(result);
  }
  


  displayComment(result) {
    let status = 'incorrect';
    const closeButton = this.createCloseButton();

    if (!result.isEvaluable) {
      this.comment.textContent = "Expression invalide";
      this.comment.style.color = "red";
      this.comment.appendChild(closeButton);
    } else if (!result.isEqual) {
      this.comment.textContent = "L'expression n'est pas égale à l'originale.";
      this.comment.style.color = "red";
      this.comment.appendChild(closeButton);
    } else if (result.isFactorized === 'insufficient') {
      this.comment.textContent = "L'expression n'est pas suffisamment factorisée.";
      this.comment.style.color = "orange";
    } else if (!result.isFactorized) {
      this.comment.textContent = "L'expression n'est pas factorisée.";
      this.comment.style.color = "orange";
    } else {
      this.comment.textContent = "✅ Factorisation correcte !";
      this.comment.style.color = "green";
      status = 'factorized';
    }

    
    this.status = status;
    this.container.dispatchEvent(new CustomEvent('inputStatus', { detail: status }));
  }

  createCloseButton() {
    const closeButton = document.createElement('span');
    closeButton.textContent = '❌';
    closeButton.style.marginLeft = '10px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontSize = '20px';
    closeButton.addEventListener('click', () => {
      this.wrapper.remove();
    });
    return closeButton;
  }
}
