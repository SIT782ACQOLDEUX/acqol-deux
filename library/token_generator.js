require('dotenv').load();

const AccessToken = require('twilio').jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;

function tokenGenerator(identity, room) {
    // Create an access token which we will sign and return to the client,
    // containing the grant we just created
    const token = new AccessToken(
        'AC41f05a8654ec60cdb0f102d4a1c6520b',
        'SK28c9e932b999a32b687dfb3030ef41f1',
        '6Jn8Gn1oYMGzyfmpNzzgGWSswZddJedu'
    );

    // Assign identity to the token
    token.identity = identity;

    // Grant the access token Twilio Video capabilities
    const grant = new VideoGrant();
    grant.room = room;
    token.addGrant(grant);

    // Serialize the token to a JWT string
    return token.toJwt();
}

module.exports = tokenGenerator;