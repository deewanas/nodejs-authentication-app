module.exports = {
    jwt: {
        secret : "shhhhh it's a secret ",
        tokens: {
            access : {
                type: 'access',
                expiresIn: '1m',
            },
            refresh: {
                type: 'refresh',
                expiresIn: '2m',
            }
        }
    }
}