// Hosted Sites uses verified platform identity instead of application passwords.
exports.hash = async () => 'platform-managed';
exports.compare = async () => false;
exports.genSalt = async () => '';
exports.sign = () => { throw new Error('Use ChatGPT sign-in'); };
