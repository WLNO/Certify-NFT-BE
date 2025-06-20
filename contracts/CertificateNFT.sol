// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract CertificateNFT is ERC721, ERC721Enumerable, ERC721URIStorage, AccessControl {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    uint256 private _tokenIdCounter;

    event CertificateIssued(address indexed recipient, uint256 indexed tokenId, string certificateType);

    constructor() ERC721("CertificateNFT", "CERT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ISSUER_ROLE, msg.sender);
    }

    function mint(address to, string memory uri, string memory certificateType) public onlyRole(ISSUER_ROLE) {
        uint256 tokenId = _tokenIdCounter;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        _tokenIdCounter++;
        emit CertificateIssued(to, tokenId, certificateType);
    }

    // Required overrides for multiple inheritance
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl, ERC721, ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function _burn(uint256 tokenId)
        internal
        override(ERC721, ERC721URIStorage)
    {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function verifyCertificate(address owner, uint256 tokenId) public view returns (bool) 
    {
        return _exists(tokenId) && ownerOf(tokenId) == owner;
    }

    function getTokenURI(uint256 tokenId) public view returns (string memory) 
    {
        return tokenURI(tokenId);
    }
}