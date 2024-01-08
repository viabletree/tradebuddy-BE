import type { Schema, Attribute } from '@strapi/strapi';

export interface KycKyc extends Schema.Component {
  collectionName: 'components_kyc_kycs';
  info: {
    displayName: 'KYC';
    icon: 'question';
  };
  attributes: {
    Question: Attribute.String;
    Answer: Attribute.Text;
  };
}

declare module '@strapi/types' {
  export module Shared {
    export interface Components {
      'kyc.kyc': KycKyc;
    }
  }
}
