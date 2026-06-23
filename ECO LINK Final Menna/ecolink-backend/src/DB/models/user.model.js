import { model, Schema } from "mongoose";

const schema = new Schema({
    firstName: {
        type: String,
        trim: true,
        required: true,
        lowercase: true
    },
    lastName: {
        type: String,
        trim: true,
        required: true,
        lowercase: true
    },

    isAdmin: {
        type: Boolean,
        default: false,
        index: true
    },

    isBlocked: {
        type: Boolean,
        default: false,
        index: true
    },

    roles: [{
        type: {
            type: String,
            enum: ['buyer', 'seller'],
            required: true
        },
        isActive: {
            type: Boolean,
            default: false
        },
        sellerInfo: {
            storeName: String,
            phone: String,
            location: String,
            bankAccount: String,
            commercialRegister: String
        },
        blockedUsers: [
  {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
],


    }],

    activeRole: {
        type: String,
        enum: ['buyer', 'seller'],
        default: 'buyer'
    },

    email: {
        type: String,
        trim: true,
        lowercase: true,
        required: true,
        unique: true,
        
    },

    password: {
        type: String,
        required: true
    },

    // ================= FORGET PASSWORD =================
    resetCode: {
        type: String
    },
    resetCodeExpires: {
        type: Date
    },
    isResetVerified: {
        type: Boolean,
        default: false
    },

    // ================= OPTIONAL =================
    phoneNumber: {
        type: String,
        required: true,
        unique: true
    },

    dob: {
        type: Date,
        validate: {
        validator:function(v){

        if(!v) return true; // Allow empty DOB
        const age = new Date().getFullYear() -new Date(v).getFullYear();
        return age >= 13 && age <= 120;
        },
        message: `Age must be between 13 and 120 years.`
        }
    },

    otp: {
        type: String
    },

    otpExpire: {
        type: Date
    },

    isVerified: {
        type: Boolean,
        default: false
    },
    
isOnline: {
    type: Boolean,
    default: false,
},

    // ================= PROFILE =================
    profilePicture: {
        type: String
    },

    profilePictureCloud: {
        secure_url: String,
        public_id: String
    },

    credentialsUpdatedAt: {
        type: Date,
        default: Date.now
    },

    deletedAt: {
        type: Date
    }
    

}, {
    timestamps: true,
    toObject: { virtuals: false },
    toJSON: { virtuals: false}
});

// ================= VIRTUALS =================


schema.virtual("currentRole").get(function () {
    const activeRole = this.roles.find(r => r.isActive);
    return activeRole ? activeRole.type : this.activeRole;
});


schema.virtual("isSeller").get(function () {
    return this.roles.some(r => r.type === 'seller' && r.isActive);
});

schema.virtual("isBuyer").get(function () {
    return this.roles.some(r => r.type === 'buyer' && r.isActive);
});

// ================= METHODS =================


schema.methods.switchRole = async function(newRole) {

    this.roles.forEach(role => {
        role.isActive = false;
    });
    

    const roleIndex = this.roles.findIndex(r => r.type === newRole);
    if (roleIndex !== -1) {
        this.roles[roleIndex].isActive = true;
    } else {

        this.roles.push({
            type: newRole,
            isActive: true,
            ...(newRole === 'seller' && { sellerInfo: {} })
        });
    }
    
    this.activeRole = newRole;
    await this.save();
    return this.currentRole;
};


schema.methods.getActiveRoleData = function() {
    return this.roles.find(r => r.isActive) || {};
};

// ================= VIRTUALS =================
schema.virtual("fullName").get(function () {
    return `${this.firstName} ${this.lastName}`;
});

schema.virtual("fullName").set(function (value) {
    const [firstName, lastName] = value.split(" ");
    this.firstName = firstName;
    this.lastName = lastName;
});

schema.virtual("Age").get(function () {
    if (!this.dob) return null;
    return new Date().getFullYear() - new Date(this.dob).getFullYear();
});

// schema.virtual("messages", {
//     ref: "Message",
//     localField: "_id",
//     foreignField: "receiverId"
// });

export const User = model("User", schema);
//E:\ECO LINK\ecolink-backend\src\DB\models\user.model.js