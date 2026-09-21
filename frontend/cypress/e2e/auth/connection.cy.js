describe('Authentication', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.visit('/')
  })

  it('logs in with the seeded user through the real backend', () => {
    cy.get('#emailLogin').type('nolan.blanc@grenoble-inp.org')
    cy.get('#passwordLogin').type('123456')
    cy.get('#emailLogin').closest('fieldset').find('button').click()

    cy.contains('Bonjour nolan blanc').should('be.visible')
  })

  it('registers a new user through the real backend', () => {
    const email = `cypress-${Date.now()}@example.com`

    cy.get('#name').type('Cypress User')
    cy.get('#emailSignUp').type(email)
    cy.get('#passwordSignUp').type('Cypress1!')
    cy.get('#passwordVerif').type('Cypress1!')
    cy.get('#emailSignUp').closest('fieldset').find('button').click()

    cy.get('#emailLogin').should('have.value', email)
    cy.get('#name').should('have.value', '')
  })
})
