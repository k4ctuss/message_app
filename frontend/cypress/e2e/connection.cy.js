
describe('Test de connections', () => {

  beforeEach(()=>{
    cy.visit('http://localhost:5173');
  })
  
  
  it('Test login valid', ()=>{

    const user = {
      name: "nolan blanc",
      email: "nolan.blanc@grenoble-inp.org",
      isAdmin:true
    }

    cy.intercept('POST', 'http://localhost:3000/login',{
      statusCode: 200,
      body:{
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30",
        user: user
      }
    }).as('login');

    cy.get('#emailLogin').type(user.email);
    cy.get('#passwordLogin').type('wahoooooo');
    cy.get('#emailLogin').parent().parent().within(()=>{
      cy.get('button').click();
    });

    cy.wait('@login');
    // verif connection
    cy.get('h1').should('includes.text', user.name)

  });

  it('Test login invalid without token', ()=>{
    // test that without token, accueil is not display
    const user = {
      name: "nolan blanc",
      email: "nolan.blanc@grenoble-inp.org",
      isAdmin:true
    }

    cy.intercept('POST', 'http://localhost:3000/login',{
      statusCode: 200,
      body:{
        user: user
      }
    }).as('login');

    cy.get('#emailLogin').type(user.email);
    cy.get('#passwordLogin').type('wahoooooooo');
    cy.get('#emailLogin').parent().parent().within(()=>{
      cy.get('button').click();
    });

    cy.wait('@login');
    // verif connection
    cy.contains('bonjour').should('not.exist');

  })

  it('Test register', ()=>{
    cy.intercept('POST', 'http://localhost:3000/register',{
      statusCode: 200,
      body:{}
    }).as('register');

    const mockUser={
      name:"un super nom",
      email: "test@test.test",
      password: "1Mot2passe$"
    } 

    cy.get('#name').type(mockUser.name);
    cy.get('#emailSignUp').type(mockUser.email);
    cy.get('#passwordSignUp').type(mockUser.password);
    cy.get('#passwordVerif').type(mockUser.password);
    cy.get('#emailSignUp').parent().parent().within(()=>{
      cy.get('button').click();
    });

    cy.wait('@register');

    cy.get('#name').should('be.empty');
    cy.get('#emailSignUp').should('be.empty');
    cy.get('#passwordSignUp').should('be.empty');
    cy.get('#passwordVerif').should('be.empty');
    cy.get('#emailLogin').should('have.value', mockUser.email);



  });
})